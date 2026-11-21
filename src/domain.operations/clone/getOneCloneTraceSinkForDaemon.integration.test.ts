import { genTempDir, given, then, useThen, when } from 'test-fns';

import { runTsProgramInChild } from '@src/.test/infra/runTsProgramInChild';

import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { getCloneTraceLogPath } from './getCloneTraceLogPath';
import { getOneCloneTraceSinkForDaemon } from './getOneCloneTraceSinkForDaemon';

/**
 * .what = a repo root whose trace log dir cannot be made, and a way to heal it
 * .why = `.agent` held as a FILE makes the log dir's mkdir fault with an errno the sink passes
 *   over; once that file is gone, the next write lands — the recovery a gap line needs
 */
const genRepoWithBlockedLog = (input: {
  slug: string;
}): { repoPath: string; blocker: string } => {
  const repoPath = genTempDir({ slug: input.slug });
  const blocker = join(repoPath, '.agent');
  writeFileSync(blocker, 'a file where the log dir belongs');
  return { repoPath, blocker };
};

/**
 * .what = a fallback dir that cannot be made — it sits under a file
 * .why = the double-fault cases need the fallback to refuse too, by real fs state
 */
const genBlockedFallbackDir = (input: { slug: string }): string => {
  const dir = genTempDir({ slug: input.slug });
  const blocker = join(dir, 'a-file');
  writeFileSync(blocker, 'x');
  return join(blocker, 'clone-trace');
};

/**
 * .what = the head every daemon trace line carries: its iso time, the daemon pid, and the
 *   clone's address when the sink was given one
 */
const TRACE_STAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z pid=\d+ (clone=\S+ )?/gm;

/**
 * .what = a daemon trace log with each line's stamp cut away
 * .why = most cases assert what a line says; the stamp is proven once, in [case1]
 */
const asUnstamped = (input: { log: string }): string =>
  input.log.replace(TRACE_STAMP_PATTERN, '');

/**
 * .what = a daemon trace log with each line's stamp masked, never cut
 * .why = a snapshot shows the whole line an operator reads, head included, with only the volatile
 *   parts (the time, the pid) masked
 */
const asStampMasked = (input: { log: string }): string =>
  input.log.replace(TRACE_STAMP_PATTERN, (_, clone?: string) =>
    clone ? '<iso> pid=<n> clone=<clone> ' : '<iso> pid=<n> ',
  );

/**
 * .what = read a file, or '' when it is absent
 * .why = several cases prove a log was NOT written; only an absent file reads as '', and any
 *   other read fault throws, so an unreadable file can never pass as an untouched one
 */
const readOrEmpty = (input: { path: string }): string => {
  try {
    return readFileSync(input.path, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return '';
    throw error;
  }
};

describe('getOneCloneTraceSinkForDaemon', () => {
  given('[case1] a writable repo log', () => {
    when('[t0] two lines are traced', () => {
      then(
        'both land in the repo day log, in order, and the fallback is untouched',
        () => {
          const repoPath = genTempDir({ slug: 'daemon-sink-c1' });
          const fallbackDir = join(
            genTempDir({ slug: 'daemon-sink-c1-fb' }),
            'fb',
          );
          const trace = getOneCloneTraceSinkForDaemon({
            clone: '@:abcd1234',
            repoPath,
            fallbackDir,
          });

          trace(
            'clone daemon event loop stalled 2497ms (cpu 38ms, loop active 40ms)\n',
          );
          trace('second\n');

          const repoLogPath = getCloneTraceLogPath({
            repoPath,
            at: new Date(),
          });
          const repoLog = readFileSync(repoLogPath, 'utf8');
          expect(asUnstamped({ log: repoLog })).toEqual(
            'clone daemon event loop stalled 2497ms (cpu 38ms, loop active 40ms)\nsecond\n',
          );

          // each line opens with its time, this daemon's pid, and the clone's address
          const lines = repoLog.split('\n').filter((row) => row !== '');
          expect(lines).toHaveLength(2);
          lines.forEach((row) =>
            expect(
              row.startsWith(` pid=${process.pid} clone=@:abcd1234 `, 24),
            ).toBe(true),
          );
          lines.forEach((row) =>
            expect(row).toMatch(
              /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z pid=\d+ /,
            ),
          );
          expect(
            readOrEmpty({ path: join(fallbackDir, basename(repoLogPath)) }),
          ).toEqual('');
        },
      );
    });
  });

  given('[case2] a repo log that cannot be written, then heals', () => {
    when('[t0] lines are traced across the gap', () => {
      const result = useThen('the sink runs', async () => {
        const { repoPath, blocker } = genRepoWithBlockedLog({
          slug: 'daemon-sink-c2',
        });
        const fallbackDir = join(
          genTempDir({ slug: 'daemon-sink-c2-fb' }),
          'fb',
        );
        const trace = getOneCloneTraceSinkForDaemon({
          clone: null,
          repoPath,
          fallbackDir,
        });

        trace('in gap one\n');
        trace('in gap two\n');
        rmSync(blocker);
        trace('after gap\n');

        const repoLogPath = getCloneTraceLogPath({ repoPath, at: new Date() });
        const fallbackPath = join(fallbackDir, basename(repoLogPath));
        return {
          repoPath,
          fallbackPath,
          fallbackLog: readOrEmpty({ path: fallbackPath }),
          repoLog: readOrEmpty({ path: repoLogPath }),
        };
      });

      then(
        'the gap lines land in the fallback log, each named with its repo and the cause',
        () => {
          expect(asUnstamped({ log: result.fallbackLog })).toEqual(
            [
              `repo=${result.repoPath} cause=ENOTDIR in gap one`,
              `repo=${result.repoPath} cause=ENOTDIR in gap two`,
              '',
            ].join('\n'),
          );

          // the words an operator reads, paths masked, so a reword shows in review
          expect(
            asStampMasked({ log: result.fallbackLog })
              .split(result.repoPath)
              .join('<repo>'),
          ).toMatchSnapshot();
        },
      );

      then(
        'the repo log first names the gap, its cause, and where the lines went',
        () => {
          expect(asUnstamped({ log: result.repoLog })).toEqual(
            `clone trace log was unwritable for 2 lines (ENOTDIR); 2 are in ${result.fallbackPath}\nafter gap\n`,
          );

          // the words an operator reads, paths masked, so a reword shows in review
          expect(
            asStampMasked({ log: result.repoLog })
              .split(result.fallbackPath)
              .join('<fallback>'),
          ).toMatchSnapshot();
        },
      );
    });
  });

  given('[case3] a repo log AND a fallback that cannot be written', () => {
    when('[t0] a line is traced, then the repo log heals', () => {
      then(
        'the line is lost, and the recovery line counts the loss and names why',
        () => {
          const { repoPath, blocker } = genRepoWithBlockedLog({
            slug: 'daemon-sink-c3',
          });
          const fallbackDir = genBlockedFallbackDir({
            slug: 'daemon-sink-c3-fb',
          });
          const trace = getOneCloneTraceSinkForDaemon({
            clone: null,
            repoPath,
            fallbackDir,
          });

          trace('lost line\n');
          rmSync(blocker);
          trace('after gap\n');

          const repoLogRaw = readFileSync(
            getCloneTraceLogPath({ repoPath, at: new Date() }),
            'utf8',
          );
          expect(asUnstamped({ log: repoLogRaw })).toEqual(
            'clone trace log was unwritable for 1 line (ENOTDIR); 1 was lost, the fallback was unwritable too (ENOTDIR)\nafter gap\n',
          );

          // the whole lines an operator reads, stamp masked, so a reword shows in review
          expect(asStampMasked({ log: repoLogRaw })).toMatchSnapshot();
        },
      );
    });
  });

  given('[case3b] a repo whose trace log dir itself is held by a file', () => {
    when('[t0] a line is traced', () => {
      then(
        'the sink falls back rather than throws — a throw from a timer would kill the daemon',
        () => {
          // the leaf dir held by a file: a recursive mkdir refuses this with its own errno, a
          //   sound-host fs fault the sink must pass over like any other
          const repoPath = genTempDir({ slug: 'daemon-sink-c3b' });
          const logDir = dirname(
            getCloneTraceLogPath({ repoPath, at: new Date() }),
          );
          mkdirSync(dirname(logDir), { recursive: true });
          writeFileSync(logDir, 'a file where the log dir belongs');
          const fallbackDir = join(
            genTempDir({ slug: 'daemon-sink-c3b-fb' }),
            'fb',
          );
          const trace = getOneCloneTraceSinkForDaemon({
            clone: null,
            repoPath,
            fallbackDir,
          });

          trace('a line\n');

          expect(
            asUnstamped({
              log: readOrEmpty({
                path: join(
                  fallbackDir,
                  basename(getCloneTraceLogPath({ repoPath, at: new Date() })),
                ),
              }),
            }),
          ).toEqual(`repo=${repoPath} cause=EEXIST a line\n`);
        },
      );
    });
  });

  given('[case3c] a repo whose .agent dir is a symlink loop', () => {
    when('[t0] a line is traced', () => {
      then(
        'the sink falls back rather than throws — a loop is host state, never a code defect',
        () => {
          // `.agent` points at itself, so every path through it loops; `.agent/` is a tree of
          //   symlinks in a real repo, so a broken link there is host state the sink must survive
          const repoPath = genTempDir({ slug: 'daemon-sink-c3c' });
          symlinkSync(join(repoPath, '.agent'), join(repoPath, '.agent'));
          const fallbackDir = join(
            genTempDir({ slug: 'daemon-sink-c3c-fb' }),
            'fb',
          );
          const trace = getOneCloneTraceSinkForDaemon({
            clone: null,
            repoPath,
            fallbackDir,
          });

          trace('a line\n');

          expect(
            asUnstamped({
              log: readOrEmpty({
                path: join(
                  fallbackDir,
                  basename(getCloneTraceLogPath({ repoPath, at: new Date() })),
                ),
              }),
            }),
          ).toEqual(`repo=${repoPath} cause=ELOOP a line\n`);
        },
      );
    });
  });

  given('[case3d] a repo root removed under a live daemon', () => {
    when('[t0] a line is traced', () => {
      then(
        'the line falls back, and the removed root is never recreated',
        () => {
          // a crew worktree removed while its daemon lives: a trace write that remade the tree
          //   would block a later `git worktree add` at that path
          const repoPath = join(
            genTempDir({ slug: 'daemon-sink-c3d' }),
            'worktree',
          );
          mkdirSync(repoPath);
          const fallbackDir = join(
            genTempDir({ slug: 'daemon-sink-c3d-fb' }),
            'fb',
          );
          const trace = getOneCloneTraceSinkForDaemon({
            clone: null,
            repoPath,
            fallbackDir,
          });
          rmSync(repoPath, { recursive: true });

          trace('a line\n');

          expect(existsSync(repoPath)).toBe(false);
          expect(
            asUnstamped({
              log: readOrEmpty({
                path: join(
                  fallbackDir,
                  basename(getCloneTraceLogPath({ repoPath, at: new Date() })),
                ),
              }),
            }),
          ).toEqual(`repo=${repoPath} cause=ENOENT a line\n`);
        },
      );
    });
  });

  given('[case4] a writer that meets a code defect', () => {
    when('[t0] a line is traced', () => {
      then(
        'the defect is thrown up loud, never passed over as a lost line',
        () => {
          // a repo path that holds a NUL byte makes node's fs throw a TypeError
          //   (`ERR_INVALID_ARG_VALUE`) — a defect class the sink must never fold into a gap.
          //   node mints it in its own realm, so it is matched by name
          const trace = getOneCloneTraceSinkForDaemon({
            clone: null,
            repoPath: join(genTempDir({ slug: 'daemon-sink-c4' }), 'nul\0byte'),
            fallbackDir: genTempDir({ slug: 'daemon-sink-c4-fb' }),
          });
          const error = (() => {
            try {
              trace('a line\n');
              return null;
            } catch (thrown) {
              return thrown;
            }
          })();
          // .note = the catch binds `unknown`; only `.name` is read, and a non-Error throw reads
          //   `undefined` there, which fails the match as it should
          expect((error as Error | null)?.name).toEqual('TypeError');
        },
      );
    });
  });

  given('[case5] the sink in its own process, across every log state', () => {
    when(
      '[t0] lines are traced while repo-unwritable, both-unwritable, and healed',
      () => {
        const run = useThen('the child runs', async () => {
          const { repoPath, blocker } = genRepoWithBlockedLog({
            slug: 'daemon-sink-c5',
          });
          const blockedFallbackDir = genBlockedFallbackDir({
            slug: 'daemon-sink-c5-fb',
          });
          const okFallbackDir = join(
            genTempDir({ slug: 'daemon-sink-c5-ok' }),
            'fb',
          );
          const sinkPath = JSON.stringify(
            join(__dirname, 'getOneCloneTraceSinkForDaemon'),
          );
          const program = [
            `const { getOneCloneTraceSinkForDaemon } = require(${sinkPath});`,
            `const both = getOneCloneTraceSinkForDaemon({ clone: null, repoPath: ${JSON.stringify(repoPath)}, fallbackDir: ${JSON.stringify(blockedFallbackDir)} });`,
            `const repoOnly = getOneCloneTraceSinkForDaemon({ clone: null, repoPath: ${JSON.stringify(repoPath)}, fallbackDir: ${JSON.stringify(okFallbackDir)} });`,
            `both('clone daemon event loop stalled 2497ms\\n');`,
            `repoOnly('clone socket server error: EPIPE\\n');`,
            `require('node:fs').rmSync(${JSON.stringify(blocker)});`,
            `both('clone daemon event loop stalled 2600ms\\n');`,
          ].join('\n');
          const result = await runTsProgramInChild({ program });
          return {
            ...result,
            repoLog: readOrEmpty({
              path: getCloneTraceLogPath({ repoPath, at: new Date() }),
            }),
          };
        });

        then('the child exits 0', () => {
          expect(run.code).toEqual(0);
        });

        then('not one byte reaches the daemon process stdout or stderr', () => {
          expect({ stdout: run.stdout, stderr: run.stderr }).toEqual({
            stdout: '',
            stderr: '',
          });
        });

        then('the healed repo log names the gap, then holds the line', () => {
          expect(run.repoLog).toContain(
            'clone trace log was unwritable for 1 line (',
          );
          expect(run.repoLog).toContain(
            'clone daemon event loop stalled 2600ms\n',
          );
        });
      },
    );
  });
});
