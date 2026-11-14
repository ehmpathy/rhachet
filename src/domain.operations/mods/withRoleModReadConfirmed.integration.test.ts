import { getError, given, then, useBeforeAll, when } from 'test-fns';

import {
  genSampleRepoWithLinkedRole,
  putSampleFile,
} from '@src/.test/assets/genSampleRepoWithLinkedRole';
import { RoleModViewStaleError } from '@src/domain.objects/RoleModViewStaleError';
import { withRoleViewLock } from '@src/domain.operations/role/withRoleViewLock';

import { renameSync } from 'node:fs';
import { join } from 'node:path';
import { assertRoleModdedViewFresh } from './assertRoleModdedViewFresh';
import { syncRoleModdedViews } from './syncRoleModdedViews';
import { withRoleModReadConfirmed } from './withRoleModReadConfirmed';

const REF = { repo: 'ehmpathy', role: 'mechanic' };

/**
 * .what = how long the test writer holds its swap open
 * .why = far past any wait a reader could guess at, so only a reader that waits on the lock
 *        itself reads the view whole
 */
const SWAP_HOLD_MS = 500;

/**
 * .what = the boot check, through the confirm, over the one linked role of the sample repo
 */
const readViewConfirmed = (input: { repo: string }) =>
  withRoleModReadConfirmed({ cwd: input.repo }, () =>
    assertRoleModdedViewFresh({
      cwd: input.repo,
      ref: REF,
      getRefsLinked: () => [REF],
    }),
  );

describe('withRoleModReadConfirmed', () => {
  given('[case1] a fresh modded view, mid-swap under a held lock', () => {
    const scene = useBeforeAll(async () => {
      const repo = genSampleRepoWithLinkedRole({
        slug: 'mods-confirm-swap',
        withMod: true,
      });
      await syncRoleModdedViews({}, repo.context);
      return repo;
    });

    when(
      '[t0] a boot reads the view while the writer holds the swap open',
      () => {
        const outcome = useBeforeAll(async () => {
          const briefs = join(scene.roleDir, 'briefs');
          const aside = join(scene.roleDir, 'briefs.aside');

          // the writer: the kind dir is absent for the whole hold, as between the two renames
          //   of a swap. the read is returned in a wrapper, so the lock never awaits it
          const held = await withRoleViewLock({ cwd: scene.repo }, async () => {
            renameSync(briefs, aside);
            const read = readViewConfirmed({ repo: scene.repo }).then(
              (mod) => ({ mod, error: null }),
              (error: Error) => ({ mod: null, error }),
            );
            await new Promise((done) => setTimeout(done, SWAP_HOLD_MS));
            renameSync(aside, briefs);
            return { read };
          });
          return held.read;
        });

        then('the boot waits out the swap and reads the view whole', () => {
          expect(outcome.error).toEqual(null);
          expect(outcome.mod?.plan.shadows).toEqual([
            'briefs/rule.require.surf-wax.md',
          ]);
        });
      },
    );
  });

  given('[case2] a view that truly lags its mod', () => {
    const scene = useBeforeAll(async () => {
      const repo = genSampleRepoWithLinkedRole({
        slug: 'mods-confirm-stale',
        withMod: true,
      });
      await syncRoleModdedViews({}, repo.context);
      putSampleFile({
        path: join(repo.modDir, 'briefs', 'howto.paddle-out.md'),
        content: 'paddle out, modded',
      });
      return repo;
    });

    when('[t0] a boot reads the view', () => {
      then('the confirm under the lock still refuses it as stale', async () => {
        const error = await getError(readViewConfirmed({ repo: scene.repo }));
        expect(error).toBeInstanceOf(RoleModViewStaleError);
        expect(error.message).toContain('is stale');
      });
    });
  });

  given('[case3] a read whose dir no mod can reach', () => {
    when('[t0] the read refuses', () => {
      then('it is not re-read: the refusal propagates as thrown', async () => {
        const reads: string[] = [];
        const error = await getError(
          withRoleModReadConfirmed({ cwd: null }, () => {
            reads.push('read');
            throw new RoleModViewStaleError('a stale view');
          }),
        );
        expect(error.message).toContain('a stale view');
        expect(reads).toEqual(['read']);
      });
    });
  });
});
