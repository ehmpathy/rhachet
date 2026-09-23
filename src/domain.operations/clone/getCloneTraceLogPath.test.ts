import { given, then, when } from 'test-fns';

import { getCloneTraceLogPath } from './getCloneTraceLogPath';
import { getCloneSayDebugLogPath } from './socket/getCloneSayDebugLogPath';

describe('getCloneTraceLogPath', () => {
  given('[case1] a repo path and a calendar day', () => {
    when('[t0] the path is computed', () => {
      then('it lands in the gitignored cache, named for the LOCAL day', () => {
        expect(
          getCloneTraceLogPath({
            repoPath: '/repo',
            at: new Date(2026, 8, 19, 3, 12),
          }),
        ).toEqual(
          '/repo/.agent/.cache/repo=rhachet/skill=clone-say/daemon.2026-09-19.log',
        );
      });
    });
  });

  given('[case2] the SAME day as a say debug log', () => {
    when('[t0] both paths are computed', () => {
      then(
        'they are siblings, never the same file — a daemon trace must not interleave into the say stream',
        () => {
          const at = new Date(2026, 8, 19, 3, 12);
          const trace = getCloneTraceLogPath({ repoPath: '/repo', at });
          const say = getCloneSayDebugLogPath({ repoPath: '/repo', at });
          expect({
            sameDir: trace.replace(/[^/]+$/, '') === say.replace(/[^/]+$/, ''),
            sameFile: trace === say,
          }).toEqual({ sameDir: true, sameFile: false });
        },
      );
    });
  });

  given('[case3] a day whose month and date are single digits', () => {
    when('[t0] the path is computed', () => {
      then(
        'both are zero-padded, so the filenames sort lexically by date',
        () => {
          expect(
            getCloneTraceLogPath({
              repoPath: '/repo',
              at: new Date(2026, 0, 7, 23, 59),
            }),
          ).toContain('daemon.2026-01-07.log');
        },
      );
    });
  });
});
