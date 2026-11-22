import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { genSampleFileTree } from '@src/.test/assets/genSampleFileTree';

import { join } from 'node:path';
import { isCloneStopSweepArmed } from './isCloneStopSweepArmed';

/**
 * .what = clamps that the stop sweep counts as armed for a clone only where its settings keep
 *         the carrier's hook
 * .why = a clone keeps the hooks its own roles author; a receipt that calls a repo-wide arm
 *        this clone's own would tell it a stop will hold that never does
 *
 * .note = INTEGRATION grain: the carrier is read off the filesystem
 */
describe('isCloneStopSweepArmed', () => {
  given('[case1] a repo whose role=any spec arms the sweep', () => {
    const scene = useBeforeAll(async () => {
      const gitroot = genTempDir({ slug: 'clone-sweep-armed' });
      genSampleFileTree({
        dir: join(gitroot, '.agent', 'repo=.this', 'role=any'),
        files: { 'boot.yml': 'budget:\n  tokens: 5_000\nbriefs:\n  say: []\n' },
      });
      return { gitroot };
    });

    when('[t0] the repo actor asks', () => {
      then(
        'the sweep is armed: the repo actor keeps the repo hooks whole',
        () => {
          expect(
            isCloneStopSweepArmed({
              gitroot: scene.gitroot,
              roles: ['mechanic'],
              isRepoActor: true,
            }),
          ).toEqual(true);
        },
      );
    });

    when('[t1] an actor whose roles hold the carrier asks', () => {
      then('the sweep is armed', () => {
        expect(
          isCloneStopSweepArmed({
            gitroot: scene.gitroot,
            roles: ['mechanic', 'any'],
            isRepoActor: false,
          }),
        ).toEqual(true);
      });
    });

    when('[t2] an actor whose roles omit the carrier asks', () => {
      then('the sweep is not armed for it: its settings drop the hook', () => {
        expect(
          isCloneStopSweepArmed({
            gitroot: scene.gitroot,
            roles: ['mechanic'],
            isRepoActor: false,
          }),
        ).toEqual(false);
      });
    });
  });

  given('[case2] a repo that arms no sweep', () => {
    const scene = useBeforeAll(async () => {
      const gitroot = genTempDir({ slug: 'clone-sweep-unarmed' });
      genSampleFileTree({
        dir: join(gitroot, '.agent', 'repo=.this', 'role=any'),
        files: { 'boot.yml': 'briefs:\n  say: []\n' },
      });
      return { gitroot };
    });

    when('[t0] the repo actor asks', () => {
      then('the sweep is not armed', () => {
        expect(
          isCloneStopSweepArmed({
            gitroot: scene.gitroot,
            roles: ['any'],
            isRepoActor: true,
          }),
        ).toEqual(false);
      });
    });
  });
});
