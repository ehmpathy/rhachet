import { genTempDir, given, then, useThen, when } from 'test-fns';

import { existsSync, readFileSync } from 'node:fs';
import { getCloneTraceLogPath } from './getCloneTraceLogPath';
import { writeCloneTraceLine } from './writeCloneTraceLine';

describe('writeCloneTraceLine', () => {
  given('[case1] a repo dir that holds no cache yet', () => {
    const repoPath = genTempDir({ slug: 'cloneTraceLine-fresh' });
    const at = new Date(2026, 8, 19, 3, 12);

    when('[t0] one line is appended', () => {
      const written = useThen('the line reaches disk', async () => {
        writeCloneTraceLine({
          repoPath,
          at,
          line: 'clone daemon event loop stalled 30013ms\n',
        });
        const path = getCloneTraceLogPath({ repoPath, at });
        return {
          exists: existsSync(path),
          content: readFileSync(path, 'utf8'),
        };
      });

      then(
        'the cache dir was created for it, never demanded of the caller',
        () => {
          expect(written.exists).toEqual(true);
        },
      );

      then(
        'the line lands verbatim — a trace is not reformatted en route',
        () => {
          expect(written.content).toEqual(
            'clone daemon event loop stalled 30013ms\n',
          );
        },
      );
    });
  });

  given('[case2] a log that already holds a line', () => {
    const repoPath = genTempDir({ slug: 'cloneTraceLine-append' });
    const at = new Date(2026, 8, 19, 3, 12);

    when('[t0] a SECOND line is appended', () => {
      const written = useThen('both lines are on disk', async () => {
        writeCloneTraceLine({ repoPath, at, line: 'first\n' });
        writeCloneTraceLine({ repoPath, at, line: 'second\n' });
        // reported as a FIELD, never a bare string — `useThen` hands back a lazy proxy, and a
        // proxy over a string decomposes into per-character keys under a deep equality
        return {
          content: readFileSync(getCloneTraceLogPath({ repoPath, at }), 'utf8'),
        };
      });

      then(
        'the log APPENDS rather than converges — a trace log is a sequence, so the first line survives the second',
        () => {
          expect(written.content).toEqual('first\nsecond\n');
        },
      );
    });
  });

  given(
    '[case3] an UNWRITABLE repo path — the durable half cannot land',
    () => {
      when('[t0] a line is appended', () => {
        const thrown = useThen('the write throws', async () => {
          try {
            writeCloneTraceLine({
              // a path under a regular FILE, so mkdir cannot succeed
              repoPath: '/dev/null/nope',
              at: new Date(2026, 8, 19),
              line: 'x\n',
            });
            return { threw: false };
          } catch {
            return { threw: true };
          }
        });

        then(
          'it THROWS rather than swallows — the caller decides what a lost second copy costs',
          () => {
            expect(thrown.threw).toEqual(true);
          },
        );
      });
    },
  );
});
