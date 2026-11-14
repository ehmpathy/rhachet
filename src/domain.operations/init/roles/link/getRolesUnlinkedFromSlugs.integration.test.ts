import { given, then, useBeforeAll, when } from 'test-fns';

import { genSampleRepoWithLinkedRole } from '@src/.test/assets/genSampleRepoWithLinkedRole';
import { withRoleViewLock } from '@src/domain.operations/role/withRoleViewLock';

import { existsSync } from 'node:fs';
import { getRolesUnlinkedFromSlugs } from './getRolesUnlinkedFromSlugs';

/**
 * .what = how long the test writer holds the role view lock
 * .why = long enough that an unlink which ignores the lock lands inside the hold
 */
const HOLD_MS = 300;

describe('getRolesUnlinkedFromSlugs', () => {
  given(
    '[case1] a linked role, while another writer holds the role view lock',
    () => {
      const scene = useBeforeAll(async () =>
        genSampleRepoWithLinkedRole({
          slug: 'roles-unlink-lock',
          withMod: false,
        }),
      );

      when('[t0] the role is unlinked mid-hold', () => {
        const outcome = useBeforeAll(async () => {
          // the writer: the unlink starts inside the hold, and is returned in a wrapper so the
          //   lock never awaits it
          const held = await withRoleViewLock({ cwd: scene.repo }, async () => {
            const unlink = getRolesUnlinkedFromSlugs(
              { slugs: ['ehmpathy/mechanic'] },
              scene.context,
            );
            await new Promise((done) => setTimeout(done, HOLD_MS));
            return { unlink, isPresentInHold: existsSync(scene.roleDir) };
          });
          return {
            removed: await held.unlink,
            isPresentInHold: held.isPresentInHold,
            isPresentAfter: existsSync(scene.roleDir),
          };
        });

        then(
          'the unlink waits for the lock: the role dir outlives the hold',
          () => {
            expect(outcome.isPresentInHold).toEqual(true);
          },
        );

        then('once the lock is free, the role is unlinked and reported', () => {
          expect(outcome.isPresentAfter).toEqual(false);
          expect(outcome.removed).toEqual([
            { repo: 'ehmpathy', role: 'mechanic' },
          ]);
        });
      });
    },
  );
});
