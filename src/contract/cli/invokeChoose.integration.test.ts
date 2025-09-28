import { Command } from 'commander';
import { mkdir, writeFile, rm, readFile, stat } from 'node:fs/promises';
import * as path from 'node:path';
import { given, when, then } from 'test-fns';

import { invokeChoose } from './invokeChoose';

// tiny fs helpers
const exists = async (p: string) =>
  stat(p)
    .then(() => true)
    .catch(() => false);

const read = async (p: string) => (await readFile(p, 'utf8')).trim();

describe('invokeChoose (integration)', () => {
  given('a fixture directory with peer files', () => {
    const fixtureRoot = path.resolve(__dirname + '/.temp/invokeChoose/');
    const peerPrefix = 'provider.scene_6.loyalty_build.v1i2.[stories]';
    const choiceDir = path.join(fixtureRoot);
    const archiveDir = path.join(fixtureRoot, '.archive');

    const peerNames = [
      `${peerPrefix}._.md`,
      `${peerPrefix}.v1._.md`,
      `${peerPrefix}.v1.md`,
      `${peerPrefix}.v1.i1.md`,
      `${peerPrefix}.v1.i2.md`,
      `${peerPrefix}.v1.i3.md`,
      `${peerPrefix}.choice.v1.i3.md`,
      `${peerPrefix}.v1.src`,
    ];
    const peerChosen = peerNames[3]!; // lets say we're choosing this one
    const unrelated = 'random.txt'; // lets include a non peer too

    const prepareTheScene = async () => {
      // refresh the fixture
      await rm(fixtureRoot, { recursive: true, force: true });
      await mkdir(choiceDir, { recursive: true });
      await mkdir(archiveDir, { recursive: true });

      // write peers with recognizable contents
      await Promise.all(
        peerNames.map((name, index) =>
          writeFile(path.join(choiceDir, name), `content-${index}`),
        ),
      );

      // an unrelated file that should remain untouched
      await writeFile(path.join(choiceDir, unrelated), 'unrelated-content');
      console.log('🧹 fixture prepared', fixtureRoot);
    };

    beforeAll(async () => {
      await prepareTheScene();
    });

    when('invoking choose with a valid chosen attempt', () => {
      // register command
      const program = new Command();
      invokeChoose({ program });

      // declare the choice
      const choicePath = path.join(choiceDir, peerChosen);

      then('it should succeed', async () => {
        await program.parseAsync(
          ['choose', '--choice', choicePath, '--archive', '@choice/.archive'],
          { from: 'user' },
        );
      });

      then('it should archive the peers', async () => {
        for (const name of peerNames) {
          const archivedPath = path.join(archiveDir, path.basename(name));
          expect(await exists(archivedPath)).toBe(true);
        }
      });

      then('it should archive the peer choice with label', async () => {
        // it should have been archived directly already
        const choiceArchived = path.join(archiveDir, path.basename(peerChosen));
        expect(await exists(choiceArchived)).toBe(true);

        // it should ALSO have been archived with .choice label
        const choiceArchivedLabeled = path.join(
          archiveDir,
          path
            .basename(peerChosen)
            .replace(`${peerPrefix}`, `${peerPrefix}.choice`),
        );
        expect(await exists(choiceArchivedLabeled)).toBe(true);
        expect(await read(choiceArchivedLabeled)).toBe(
          await read(path.join(choiceDir, peerChosen)),
        );
      });

      then(
        'it should keep only the .src and choice in the choice directory',
        async () => {
          // chosen remains in place
          expect(await exists(choicePath)).toBe(true);

          // .src peers remain in place
          expect(
            await exists(path.join(choiceDir, `${peerPrefix}.v1.src`)),
          ).toBe(true);

          // non-source, non-chosen peers should be deleted from workdir
          const shouldBeDeleted = peerNames.filter(
            (p) => !p.endsWith('.src') && p !== peerChosen,
          );
          for (const name of shouldBeDeleted) {
            expect(await exists(path.join(choiceDir, name))).toBe(false);
          }

          // unrelated file should remain untouched
          expect(await exists(path.join(choiceDir, unrelated))).toBe(true);
          expect(await read(path.join(choiceDir, unrelated))).toBe(
            'unrelated-content',
          );
        },
      );
    });
  });
});
