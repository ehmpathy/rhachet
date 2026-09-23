import { given, then, when } from 'test-fns';

import { getCloneSayDebugLogPath } from './getCloneSayDebugLogPath';

describe('getCloneSayDebugLogPath', () => {
  given('[case1] a repo path and a date', () => {
    when('[t0] the path is computed', () => {
      const path = getCloneSayDebugLogPath({
        repoPath: '/repo',
        at: new Date(2026, 8, 16, 13, 45),
      });

      then(
        'it lands under the gitignored .agent cache, by skill coordinate',
        () => {
          expect(path).toEqual(
            '/repo/.agent/.cache/repo=rhachet/skill=clone-say/debug.2026-09-16.log',
          );
        },
      );
    });
  });

  given('[case2] a date whose month and day are single-digit', () => {
    when('[t0] the path is computed', () => {
      const path = getCloneSayDebugLogPath({
        repoPath: '/repo',
        at: new Date(2026, 0, 5, 9, 0),
      });

      then('both segments are zero-padded, so the files sort by day', () => {
        expect(path).toContain('debug.2026-01-05.log');
      });
    });
  });

  given('[case3] two instants on the SAME local day', () => {
    when('[t0] both paths are computed', () => {
      const pathEarly = getCloneSayDebugLogPath({
        repoPath: '/repo',
        at: new Date(2026, 8, 16, 0, 1),
      });
      const pathLate = getCloneSayDebugLogPath({
        repoPath: '/repo',
        at: new Date(2026, 8, 16, 23, 59),
      });

      then('they name ONE file — a day of failures reads side by side', () => {
        expect(pathEarly).toEqual(pathLate);
      });
    });
  });
});
