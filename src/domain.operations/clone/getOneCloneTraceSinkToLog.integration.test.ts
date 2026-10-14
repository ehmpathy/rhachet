import { genTempDir, given, then, when } from 'test-fns';

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getOneCloneTraceSinkToLog } from './getOneCloneTraceSinkToLog';

// .note = every case drives the real writer against the real fs; which faults the sink passes
//   over is proven at the pure grain, in `isTraceLogWriteFault.test.ts`
/**
 * .mock = `process.stderr.write`, spied and silenced in [case1] and [case2], restored in `finally`
 * .why = stderr IS this sink's contract for a lost trace: its one documented write is the line
 *   under test, so the spy reads the subject's own output, it stubs no dependency. a seam would
 *   not help here: the sink is the seam other callers inject (`genCloneSocketServer`'s `trace`),
 *   and its fallback channel is the process stderr by definition
 * .real = the writer, the fs fault (a file where the log dir belongs) and the defect throw are all
 *   real; only the final stderr write is observed rather than emitted
 */
describe('getOneCloneTraceSinkToLog', () => {
  given('[case1] a repo path where the log dir cannot be made', () => {
    when('[t0] a line is traced', () => {
      then('the write fault is named on stderr, and the sink returns', () => {
        const dir = genTempDir({ slug: 'trace-sink-write-fault' });
        const repoPath = join(dir, 'a-file-not-a-dir');
        writeFileSync(repoPath, 'x');
        const errSpy = jest
          .spyOn(process.stderr, 'write')
          .mockImplementation(() => true);
        try {
          expect(() =>
            getOneCloneTraceSinkToLog({ repoPath })('a line\n'),
          ).not.toThrow();
          const written = errSpy.mock.calls.map((call) => String(call[0]));
          // the line is the sink's one deliberate stderr write, so its whole shape is pinned:
          //   one line, a fixed prefix a stderr parser can skip, the errno, and a newline
          expect(written).toHaveLength(1);
          expect(written[0]).toMatch(
            /^clone trace could not reach its durable log: ENOTDIR: [^\n]+\n$/,
          );
        } finally {
          errSpy.mockRestore();
        }
      });
    });
  });

  given('[case2] a writer that meets a code defect', () => {
    when('[t0] a line is traced', () => {
      then(
        'the defect is thrown up loud, never folded into a stderr line',
        () => {
          // a repo path that is not a string makes node's path join throw a TypeError —
          //   a defect class, which the sink must never pass over as a lost trace. node
          //   mints it in its own realm, so it is matched by name, not by `instanceof`
          const repoPath = undefined as unknown as string;
          const errSpy = jest
            .spyOn(process.stderr, 'write')
            .mockImplementation(() => true);
          try {
            const error = (() => {
              try {
                getOneCloneTraceSinkToLog({ repoPath })('a line\n');
                return null;
              } catch (thrown) {
                return thrown;
              }
            })();
            expect((error as Error | null)?.name).toEqual('TypeError');
            expect(errSpy).not.toHaveBeenCalled();
          } finally {
            errSpy.mockRestore();
          }
        },
      );
    });
  });
});
