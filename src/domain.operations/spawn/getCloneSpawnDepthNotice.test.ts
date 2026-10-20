import { given, then, when } from 'test-fns';

import { getCloneSpawnDepthNotice } from './getCloneSpawnDepthNotice';

describe('getCloneSpawnDepthNotice', () => {
  given('[case1] a top-level clone, minted at depth 0', () => {
    when('[t0] a human watches stderr', () => {
      then('no notice: the clone may spawn', () => {
        expect(
          getCloneSpawnDepthNotice({ depth: 0, isTtyStderr: true }),
        ).toBeNull();
      });
    });
  });

  given('[case2] a clone minted at depth 1', () => {
    when('[t0] a human watches stderr, as with `echo why | rhx enroll`', () => {
      const notice = getCloneSpawnDepthNotice({ depth: 1, isTtyStderr: true });

      then('the notice names the depth and that it cannot spawn', () => {
        expect(notice).toContain('minted at depth 1');
        expect(notice).toContain('cannot spawn');
      });

      then('the notice names the cure', () => {
        expect(notice).toContain('--reason <text>, not @stdin');
      });

      then('the notice renders whole, for review', () => {
        expect(notice).toMatchSnapshot();
      });
    });

    when(
      '[t1] no human watches stderr, as with a cron or a parent clone',
      () => {
        then('no notice: a headless log stays unchanged', () => {
          expect(
            getCloneSpawnDepthNotice({ depth: 1, isTtyStderr: false }),
          ).toBeNull();
        });
      },
    );
  });
});
