import type { Command } from 'commander';
import glob from 'fast-glob';
import * as fs from 'fs';
import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';
import * as path from 'path';
import { genArtifactGitFile } from 'rhachet-artifact-git';

import { getPeerQualifiersOfOutputChoice } from '../../logic/invoke/getPeerQualifiersOfOutputChoice';

/**
 * .what = adds the "choose" command to the CLI
 * .why = allows users to choose a specific attempt file, archive its peer files, and clean up unrelated ones
 */
export const invokeChoose = ({ program }: { program: Command }): void => {
  program
    .command('choose')
    .requiredOption('--choice <path>', 'path to chosen attempt file (relative)')
    .requiredOption('--archive <dir>', 'directory where peers will be archived')
    .description(
      'select one attempt file, archive its peer files, and remove unrelated ones',
    )
    .action(async (opts: { choice: string; archive: string }) => {
      // standardize the path declarations
      const choicePath = path.resolve(opts.choice);
      const choiceFile = path.basename(choicePath);
      const choiceDir = path.dirname(choicePath);

      // resolve archive dir:
      // - if starts with "@choice/", make it relative to choiceDir
      // - otherwise, resolve relative to cwd as normal
      const archiveDir = opts.archive.startsWith('@choice/')
        ? path.join(choiceDir, opts.archive.replace(/^@choice\//, ''))
        : path.resolve(opts.archive);

      // verify choice exists and is valid
      if (!fs.existsSync(choicePath))
        BadRequestError.throw(`choice file not found: ${choicePath}`, { opts });
      if (choiceFile.endsWith('.src'))
        BadRequestError.throw(`--choice cannot be a .src file`, { opts });

      // grab the peer qualifiers
      const peerQualifier = getPeerQualifiersOfOutputChoice(choiceFile);
      if (!peerQualifier.prefix)
        BadRequestError.throw(
          `unrecognized file naming pattern: ${choiceFile}`,
        );

      // build glob patterns
      const globPeersByExt = path.join(
        choiceDir,
        `${peerQualifier.prefix}*.${peerQualifier.extension}`,
      );
      const globPeersBySrc = path.join(
        choiceDir,
        `${peerQualifier.prefix}*.src`,
      );

      // collect all peer paths
      const peerPaths = await glob([globPeersByExt, globPeersBySrc], {
        cwd: choiceDir,
        onlyFiles: true,
        dot: false,
        absolute: true,
      });

      // copy peer files to archive dir; remove the non.source and the non.chosen
      await Promise.all(
        peerPaths.map(async (peerPath) => {
          // declare the .into and .from archive files
          const peerDetected = genArtifactGitFile({ uri: peerPath });
          const peerArchived = genArtifactGitFile({
            uri: path.join(archiveDir, path.basename(peerPath)),
          });

          // grab the detected content
          const peerContent =
            (await peerDetected.get())?.content ??
            UnexpectedCodePathError.throw(
              'how could a peer detected by prefix not have contents?',
              {
                path,
                peerQualifier,
              },
            );

          // move into archive
          await peerArchived.set({
            content: peerContent,
          });

          // label the choice file and archive that too
          const isChosen = peerPath.endsWith(opts.choice); // equal to choice (overlap by suffix)
          if (isChosen) {
            const peerArchivedAsChoice = genArtifactGitFile({
              uri: peerArchived.ref.uri.replace(
                peerQualifier.prefix,
                peerQualifier.prefix + '.choice',
              ),
            });
            await peerArchivedAsChoice.set({ content: peerContent });
          }

          // drop if non source and non chosen .from files
          const isSource = peerPath.endsWith('.src');
          if (!isSource && !isChosen) await peerDetected.del();
        }),
      );

      console.log(``);
      console.log(`🏆 choice assigned (${peerPaths.length} archived)`);
    });
};
