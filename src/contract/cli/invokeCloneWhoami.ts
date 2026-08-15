import type { Command } from 'commander';
import { ConstraintError, MalfunctionError } from 'helpful-errors';

import { getCloneReachState } from '@src/domain.operations/clone/getCloneReachState';
import { getOneCloneByRef } from '@src/domain.operations/clone/getOneCloneByRef';
import { getOneRepoPath } from '@src/infra/host/getOneRepoPath';
import { CLONE_ENV_KEYS } from '@src/utils/cloneEnvKeys';

import { asCliOutputMode } from './asCliOutputMode';
import { renderCliOutput } from './renderCliOutput';
import { withCliOutputErrors } from './withCliOutputErrors';

/**
 * .what = register `rhx clone whoami` on the clone group
 * .why =
 *   - a clone that self-manages must learn its OWN address in one read (usecase.11):
 *     its serial is injected into its env at spawn, so it reads that, never a
 *     fragile pid/cwd match
 *   - `--output json` carries the clone's actor hash, so the clone can then run
 *     `rhx clone list @<actorHash>` to enumerate its SIBLING clones — the wish's
 *     self-management motive, end to end
 *
 * .note = run OUTSIDE a clone (a plain shell, no injected serial) it fails loud —
 *   a caller is never handed a fabricated self-identity
 */
export const invokeCloneWhoami = ({ clone }: { clone: Command }): void => {
  clone
    .command('whoami')
    .description("show THIS clone's own address (run from within a clone)")
    .option('--output <mode>', 'output mode: tree (default) or json', 'tree')
    .action(async (opts: { output?: string }) => {
      await withCliOutputErrors({
        outputRaw: opts.output,
        run: async () => {
          const mode = asCliOutputMode({ raw: opts.output });

          // the spawn injects this clone's serial into its env; absent = not a clone
          const serial = process.env[CLONE_ENV_KEYS.serial];
          if (!serial)
            throw new ConstraintError('not run inside an enrolled clone', {
              hint: 'whoami works from within a clone spawned by `rhx enroll`',
            });

          const repoPath = getOneRepoPath({ from: process.cwd() });
          const self = getOneCloneByRef({
            repoPath,
            ref: { by: 'serial', serial },
          });
          if (self === null)
            throw new MalfunctionError(
              'the clone env serial names no on-disk clone',
              { serial },
            );

          const reachState = await getCloneReachState({ clone: self });
          const address = self.slug ? `@:${self.slug}` : `@:${self.serial}`;
          const actorHash = self.actor.hash;

          const tree = [
            `😶 you are ${address}`,
            `   ├─ serial=${self.serial}`,
            `   ├─ state=${reachState}`,
            `   └─ actor=@${actorHash}`,
          ].join('\n');

          console.log(
            renderCliOutput({
              mode,
              tree,
              data: {
                serial: self.serial,
                slug: self.slug,
                reachState,
                actorHash,
              },
            }),
          );
        },
      });
    });
};
