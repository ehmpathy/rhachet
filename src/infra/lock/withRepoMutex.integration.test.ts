import { MalfunctionError } from 'helpful-errors';
import { genTempDir, given, then, when } from 'test-fns';

import { withRepoMutex } from '@src/infra/lock/withRepoMutex';

import { spawn } from 'node:child_process';
import { EventEmitter, once } from 'node:events';
import { readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * .mock = `process.stderr.write`, spied and silenced in [case2], restored in `finally`
 * .why = the wait notice (`ℹ another rhx process holds <file>; this one will wait for it`) is a
 *   user-facing line the mutex writes to stderr by contract, once per wait, so a long wait never
 *   reads as a hang. the spy reads that line and keeps it out of the test log; it stubs no
 *   collaborator — the cache dir, the peer hold and the wait bound are all real
 * .real = the on-disk cache, the peer hold, the poll loop and the wait bound; only the notice's
 *   stderr write is observed rather than emitted. the other cases leave stderr unspied
 */

/**
 * .what = hold a file's mutex from this process until the gate emits `release`
 * .why = a peer hold the case controls: it is taken before the case runs its section, and it
 *   ends when the case says so (or never, for the wait bound case)
 */
const genPeerHold = async (input: {
  repoPath: string;
  path: string;
  leaseMs?: number;
}): Promise<{ release: () => Promise<void> }> => {
  const gate = new EventEmitter();
  const isHeld = new EventEmitter();
  const held = once(isHeld, 'held');
  const span = withRepoMutex(
    { repoPath: input.repoPath, path: input.path, leaseMs: input.leaseMs },
    async () => {
      isHeld.emit('held');
      await once(gate, 'release');
    },
  );
  // a lapsed lease rejects the span before the case releases it; settle it at once
  const settled = span.catch(() => undefined);
  await held;
  return {
    release: async () => {
      gate.emit('release');
      await settled;
    },
  };
};

/**
 * .what = run one process that bumps a counter file N times, each bump a guarded
 *   read-modify-write
 * .why = two such processes at once prove the mutex keeps every bump across processes:
 *   without it, a bump read before a peer's write and written after it would drop the peer's
 */
const runCounterProcess = (input: {
  repoPath: string;
  path: string;
  times: number;
}): Promise<number> =>
  new Promise((settle, fail) => {
    const program = [
      `const { readFileSync, writeFileSync } = require('node:fs');`,
      `const { withRepoMutex } = require(${JSON.stringify(join(__dirname, 'withRepoMutex'))});`,
      `const repoPath = ${JSON.stringify(input.repoPath)};`,
      `const path = ${JSON.stringify(input.path)};`,
      `(async () => {`,
      `  for (let i = 0; i < ${input.times}; i++)`,
      `    await withRepoMutex({ repoPath, path }, async () => {`,
      `      const count = Number(readFileSync(path, 'utf8'));`,
      `      writeFileSync(path, String(count + 1));`,
      `    });`,
      `})().catch((error) => { console.error(error); process.exit(1); });`,
    ].join('\n');
    const child = spawn(process.execPath, ['-r', 'tsx/cjs', '-e', program], {
      stdio: 'inherit',
    });
    child.on('error', fail);
    child.on('exit', (code) => settle(code ?? 1));
  });

describe('withRepoMutex', () => {
  given('[case1] a free file', () => {
    when('[t0] a section runs under the mutex', () => {
      then(
        'it returns the section result, and leaves no file beside the target',
        async () => {
          const repoPath = genTempDir({ slug: 'withRepoMutex-c1t0' });
          const path = join(repoPath, 'settings.of.repo.json');

          const result = await withRepoMutex(
            { repoPath, path },
            async () => 'done',
          );

          expect(result).toEqual('done');
          expect(readdirSync(repoPath).sort()).toEqual(['.agent']);
          expect(
            readFileSync(
              join(repoPath, '.agent', '.actors', '.locks', '.gitignore'),
              'utf8',
            ),
          ).toEqual('*\n');
        },
      );
    });

    when('[t1] the section throws', () => {
      then('the error propagates, and the file is free after', async () => {
        const repoPath = genTempDir({ slug: 'withRepoMutex-c1t1' });
        const path = join(repoPath, 'settings.of.repo.json');

        const error = await withRepoMutex({ repoPath, path }, async () => {
          throw new MalfunctionError('section fault');
        }).then(
          () => null,
          (thrown: Error) => thrown,
        );
        expect(error?.message).toContain('section fault');

        const result = await withRepoMutex(
          { repoPath, path, waitMs: 200 },
          async () => 'free',
        );
        expect(result).toEqual('free');
      });
    });
  });

  given('[case2] a file a peer holds', () => {
    when('[t0] the wait bound passes before the peer releases', () => {
      then(
        'it announces the wait once, then fails loud with the file path',
        async () => {
          const repoPath = genTempDir({ slug: 'withRepoMutex-c2t0' });
          const path = join(repoPath, 'settings.of.repo.json');
          const peer = await genPeerHold({ repoPath, path });
          const errSpy = jest
            .spyOn(process.stderr, 'write')
            .mockImplementation(() => true);

          try {
            const error = await withRepoMutex(
              { repoPath, path, waitMs: 300 },
              async () => 'never',
            ).then(
              () => null,
              (thrown: Error) => thrown,
            );
            expect(error?.message).toContain(
              'another rhx process holds this file',
            );
            expect(error?.message).toContain(path);
            expect(error?.constructor.name).toEqual('ConstraintError');

            // the wait is announced once, so a two-minute wait never reads as a hang
            const written = errSpy.mock.calls.map((call) => String(call[0]));
            expect(written).toEqual([
              `ℹ another rhx process holds ${path}; this one will wait for it\n`,
            ]);
          } finally {
            errSpy.mockRestore();
            await peer.release();
          }
        },
      );
    });

    when('[t1] the peer releases inside the wait bound', () => {
      then(
        'the section runs once the file frees, after one notice',
        async () => {
          const repoPath = genTempDir({ slug: 'withRepoMutex-c2t1' });
          const path = join(repoPath, 'settings.of.repo.json');
          const peer = await genPeerHold({ repoPath, path });
          const errSpy = jest
            .spyOn(process.stderr, 'write')
            .mockImplementation(() => true);
          setTimeout(() => void peer.release(), 250);

          try {
            const result = await withRepoMutex(
              { repoPath, path, waitMs: 5_000 },
              async () => 'ran after the peer',
            );
            expect(result).toEqual('ran after the peer');
            expect(errSpy).toHaveBeenCalledTimes(1);
          } finally {
            errSpy.mockRestore();
            await peer.release();
          }
        },
      );
    });
  });

  given('[case3] a hold whose holder went silent past its lease', () => {
    when('[t0] a section asks for the file', () => {
      then('the lapsed hold is retaken and the section runs', async () => {
        // a holder that never releases stands in for a killed `rhx`; its short lease lapses
        const repoPath = genTempDir({ slug: 'withRepoMutex-c3t0' });
        const path = join(repoPath, 'settings.of.repo.json');
        const peer = await genPeerHold({ repoPath, path, leaseMs: 300 });
        await new Promise<void>((done) => setTimeout(done, 400));

        try {
          const result = await withRepoMutex(
            { repoPath, path, waitMs: 2_000 },
            async () => 'ran',
          );
          expect(result).toEqual('ran');
        } finally {
          await peer.release();
        }
      });
    });
  });

  given('[case4] two spans on one file from peer call chains', () => {
    when('[t0] both start at once', () => {
      then(
        'they take turns: no span starts before the other ends',
        async () => {
          const repoPath = genTempDir({ slug: 'withRepoMutex-c4t0' });
          const path = join(repoPath, 'settings.of.repo.json');
          // .note = deliberate mutation — `events` records the order the two spans
          //         ran in; bounded to this test, read once by the assertion below
          const events: string[] = [];
          const span = (name: string) =>
            withRepoMutex({ repoPath, path }, async () => {
              events.push(`${name}:start`);
              await new Promise<void>((done) => setTimeout(done, 150));
              events.push(`${name}:end`);
            });

          await Promise.all([span('a'), span('b')]);

          expect([
            ['a:start', 'a:end', 'b:start', 'b:end'],
            ['b:start', 'b:end', 'a:start', 'a:end'],
          ]).toContainEqual(events);
        },
      );
    });
  });

  given('[case5] two spans on two files at once', () => {
    when('[t0] both start at once', () => {
      then('neither waits on the other', async () => {
        const repoPath = genTempDir({ slug: 'withRepoMutex-c5t0' });
        const peer = await genPeerHold({
          repoPath,
          path: join(repoPath, 'a.json'),
        });

        try {
          const result = await withRepoMutex(
            { repoPath, path: join(repoPath, 'b.json'), waitMs: 200 },
            async () => 'b ran',
          );
          expect(result).toEqual('b ran');
        } finally {
          await peer.release();
        }
      });
    });
  });

  given('[case6] two processes bump one counter at once', () => {
    when('[t0] each bumps it many times under the mutex', () => {
      then('every bump survives', async () => {
        const repoPath = genTempDir({ slug: 'withRepoMutex-c6t0' });
        const path = join(repoPath, 'counter');
        writeFileSync(path, '0');

        const codes = await Promise.all([
          runCounterProcess({ repoPath, path, times: 50 }),
          runCounterProcess({ repoPath, path, times: 50 }),
        ]);

        expect(codes).toEqual([0, 0]);
        expect(readFileSync(path, 'utf8')).toEqual('100');
      });
    });
  });

  given(
    '[case8] the actors root is removed between two guarded writes of one process',
    () => {
      when('[t0] the second write takes the same file mutex', () => {
        then(
          'it runs, since the cache dir is ensured on every use',
          async () => {
            const repoPath = genTempDir({ slug: 'mutex-root-removed' });
            const path = join(repoPath, 'counter.txt');
            writeFileSync(path, '0');
            await withRepoMutex({ repoPath, path }, async () => undefined);

            // the memoized cache outlives its dir — a suite or a human removed `.agent/`
            rmSync(join(repoPath, '.agent'), { recursive: true, force: true });

            const ran = await withRepoMutex(
              { repoPath, path },
              async () => 'ran',
            );
            expect(ran).toEqual('ran');
          },
        );
      });
    },
  );

  given('[case7] the prod source of rhachet', () => {
    when('[t0] its lock primitives are listed', () => {
      // inventory.of=requirements.case=6: every lock goes through `with-simple-mutex`, and
      //   this wrapper is its one owner, so no second lock protocol can grow back in `src/`
      const srcDir = join(__dirname, '..', '..');
      const prodFiles = readdirSync(srcDir, { recursive: true })
        .map(String)
        .filter((name) => name.endsWith('.ts') && !name.includes('.test.'))
        .filter((name) => !name.startsWith(join('.test', '')));
      const read = (name: string) => readFileSync(join(srcDir, name), 'utf8');

      then('only this wrapper imports with-simple-mutex', () => {
        const importers = prodFiles.filter((name) =>
          /['"]with-simple-mutex['"]/.test(read(name)),
        );
        expect(importers).toEqual([join('infra', 'lock', 'withRepoMutex.ts')]);
      });

      then('no file claims a hand-rolled lock file or a frozen wait', () => {
        // the one exception is a lock that joins ANOTHER program's protocol: claude-code
        //   guards its shared login with proper-lockfile on `~/.claude/.storage-write`, and only
        //   that same protocol excludes it (wisher, 2026-10-13; case 6 .the exception)
        const foreignProtocolLocks = [
          join(
            'domain.operations',
            'brain',
            'auth',
            'withBrainAuthWriteLock.ts',
          ),
        ];
        const rollers = prodFiles
          .filter((name) => !foreignProtocolLocks.includes(name))
          .filter((name) =>
            /Atomics\.wait|\.lock`|\.lock'|\.lock"/.test(read(name)),
          );
        expect(rollers).toEqual([]);
      });
    });
  });
});
