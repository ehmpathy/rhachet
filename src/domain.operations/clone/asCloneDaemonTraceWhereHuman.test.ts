import { given, then, when } from 'test-fns';

import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { asCloneDaemonTraceWhereHuman } from './asCloneDaemonTraceWhereHuman';
import { getCloneTraceLogPath } from './getCloneTraceLogPath';
import { CLONE_TRACE_FALLBACK_DIR } from './getOneCloneTraceSinkForDaemon';

describe('asCloneDaemonTraceWhereHuman', () => {
  given('[case1] the copy a hint prints', () => {
    when('[t0] its placeholders are filled with this host and one day', () => {
      const where = asCloneDaemonTraceWhereHuman();
      const [repoPart, fallbackPart] = [...where.matchAll(/`([^`]+)`/g)].map(
        (match) => match[1]!,
      );

      then(
        'the repo part is the path the daemon writes, relative to the repo',
        () => {
          const at = new Date(2026, 10, 17);
          expect(
            join(
              repoPart!
                .replace('<repo>', '/repo')
                .replace('<yyyy-mm-dd>', '2026-11-17'),
            ),
          ).toEqual(getCloneTraceLogPath({ repoPath: '/repo', at }));
        },
      );

      then('the fallback part is the dir the daemon falls back to', () => {
        // the copy closes the dir with a `/`, so a reader sees it is a dir; the constant does not
        const filled = fallbackPart!
          .replace('<tmpdir>', tmpdir())
          .replace('<uid>', String(process.getuid?.() ?? 'none'))
          .replace(/\/$/, '');
        expect(filled).toEqual(CLONE_TRACE_FALLBACK_DIR);
      });

      then('no part reads as a shell variable', () => {
        expect(where).not.toMatch(/\$[a-z]/i);
      });
    });
  });
});
