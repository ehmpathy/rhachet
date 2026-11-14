import { ConstraintError, MalfunctionError } from 'helpful-errors';
import {
  addDuration,
  asIsoTimeStamp,
  type IsoDuration,
  toMilliseconds,
} from 'iso-time';
import {
  genTempDir,
  getError,
  given,
  then,
  useBeforeAll,
  useThen,
  when,
} from 'test-fns';

import { withDiskMutex } from '@src/infra/lock/withRepoMutex';

import { type ChildProcess, spawn } from 'node:child_process';
import { EventEmitter, once } from 'node:events';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, join } from 'node:path';
import { asKeyrackErroredKeyTip } from '../../../cli/asKeyrackErroredKeyTip';
import { delAwsProfileExport } from './delAwsProfileExport';
import { genAwsProfileExport } from './genAwsProfileExport';

/**
 * .what = a fake `aws` cli on PATH, which records each call and acts per FAKE_AWS_MODE
 * .why = the real cli needs an sso session; the fake proves how many exports ran, and lets a
 *   case make the export fail, return too few keys, or hang
 * .note = no jest.mock: the op runs its real exec, cache file and disk mutex; only the binary
 *   at the far end of PATH is a stand-in
 * .note = it refuses, as the real cli does, any argv but `configure export-credentials
 *   --profile <name> --format env-no-export`; each call logs `<pid> <profile>`
 * .note = FAKE_AWS_MKDIR makes a dir at that path mid-export, so a case can fault the cache write
 * .note = it accepts any profile name, where the real cli refuses one absent from the config
 *   file; the cases use fictional profiles, and [case1] asserts the exact profile it was asked for
 */
const FAKE_AWS_SCRIPT = [
  '#!/usr/bin/env bash',
  'if [ "$1 $2 $3" != "configure export-credentials --profile" ] || [ -z "${4:-}" ] || [ "${5:-} ${6:-}" != "--format env-no-export" ] || [ -n "${7:-}" ]; then',
  '  echo "aws: error: argument mismatch: $*" >&2',
  '  exit 252',
  'fi',
  'echo "$$ $4" >> "$FAKE_AWS_CALLS"',
  'case "${FAKE_AWS_MODE:-ok}" in',
  '  ok)',
  '    sleep "${FAKE_AWS_SLEEP:-0}"',
  '    [ -z "${FAKE_AWS_MKDIR:-}" ] || mkdir -p "$FAKE_AWS_MKDIR"',
  '    echo "AWS_ACCESS_KEY_ID=${FAKE_AWS_KEY:-AKIAFAKEKEY}"',
  '    echo "AWS_SECRET_ACCESS_KEY=secret-of-${FAKE_AWS_KEY:-AKIAFAKEKEY}"',
  '    echo "AWS_SESSION_TOKEN=token-of-${FAKE_AWS_KEY:-AKIAFAKEKEY}"',
  '    echo "AWS_CREDENTIAL_EXPIRATION=${FAKE_AWS_EXPIRATION}"',
  '    ;;',
  '  fail)',
  '    sleep "${FAKE_AWS_SLEEP:-0}"',
  '    echo "Error from sso: Token has expired and refresh failed" >&2',
  '    exit 255',
  '    ;;',
  '  incomplete)',
  '    echo "AWS_ACCESS_KEY_ID=AKIALEAKCHECKVALUE"',
  '    ;;',
  '  hang)',
  '    exec sleep 20',
  '    ;;',
  'esac',
].join('\n');

/**
 * .what = an iso timestamp `minutes` from now
 */
const asExpirationIn = (input: { minutes: number }): string =>
  addDuration(asIsoTimeStamp(new Date()), { minutes: input.minutes });

/**
 * .what = a temp HOME and a fake aws bin, with the env that wires them in
 */
const genFakeAwsBox = (input: { slug: string }) => {
  const home = genTempDir({ slug: input.slug });
  const bin = join(home, 'bin');
  mkdirSync(bin, { recursive: true });
  writeFileSync(join(bin, 'aws'), FAKE_AWS_SCRIPT, { mode: 0o755 });
  const calls = join(home, 'aws.calls');
  writeFileSync(calls, '');
  return {
    home,
    calls,
    env: {
      HOME: home,
      PATH: `${bin}:${process.env.PATH}`,
      FAKE_AWS_CALLS: calls,
      FAKE_AWS_EXPIRATION: asExpirationIn({ minutes: 60 }),
    },
  };
};

/**
 * .what = a text with both names of a temp HOME masked as `<home>`: its realpath, then its given path
 * .why = a temp dir may sit behind a symlink (macos `/var` → `/private/var`); an error the disk
 *   raises names the realpath, so a mask of the given path alone would leak it into a snap
 */
const asHomeMasked = (input: { text: string; home: string }): string =>
  input.text
    .split(realpathSync(input.home))
    .join('<home>')
    .split(input.home)
    .join('<home>');

/**
 * .what = the errored row `rhx keyrack unlock` renders for an export fault, home-masked
 * .why = a snap of the row shows what the human reads, beside the error message the op throws
 */
const asUnlockRowOf = (input: { error: Error; home: string }): string =>
  asHomeMasked({
    text: asKeyrackErroredKeyTip({
      cause: input.error,
      slug: 'acme.test.AWS_PROFILE',
      orgDefault: 'acme',
      owner: null,
    }),
    home: input.home,
  });

/**
 * .what = how many times the fake aws ran
 */
const getOneCallCount = (input: { calls: string }): number =>
  getAllCalls(input).length;

/**
 * .what = each call the fake aws logged, as its pid and the profile it was asked for
 */
const getAllCalls = (input: {
  calls: string;
}): { pid: number; profile: string }[] =>
  readFileSync(input.calls, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => line.split(' '))
    .map(([pid, profile]) => ({ pid: Number(pid), profile: profile ?? '' }));

/**
 * .what = wait until the fake aws has been called at least `count` times
 * .why = a case that must order two callers waits on the cli's own record, never a fixed sleep
 */
const waitForCallCount = async (input: {
  calls: string;
  count: number;
}): Promise<void> => {
  const deadline = Date.now() + 30_000;
  while (getOneCallCount({ calls: input.calls }) < input.count) {
    if (Date.now() > deadline)
      throw new MalfunctionError('the fake aws was never called', {
        calls: input.calls,
        countExpected: input.count,
        countFound: getOneCallCount({ calls: input.calls }),
        hint: 'check that the fake aws bin is first on PATH and executable, and that FAKE_AWS_CALLS is set',
      });
    await new Promise((settle) => setTimeout(settle, 100));
  }
};

/**
 * .what = wait until a file is gone, polled up to a bound
 * .why = a case that asserts a drop before a queue reads the disk, never a fixed sleep
 */
const waitForFileAbsent = async (input: { path: string }): Promise<void> => {
  const deadline = Date.now() + 10_000;
  while (existsSync(input.path)) {
    if (Date.now() > deadline)
      throw new MalfunctionError('the cache file was never dropped', {
        path: input.path,
        hint: 'check that a refresh drops the entry before it queues for the key',
      });
    await new Promise((settle) => setTimeout(settle, 50));
  }
};

/**
 * .what = whether a process still runs, polled up to a bound
 * .why = a killed child is reaped a moment after its kill; a poll reads the settled state
 */
const isPidAliveAfter = async (input: {
  pid: number;
  boundMs: number;
}): Promise<boolean> => {
  const isAlive = (): boolean => {
    try {
      process.kill(input.pid, 0);
      return true;
    } catch (error) {
      // .cast = node process errors carry `code`; only ESRCH means no such process
      if ((error as NodeJS.ErrnoException).code === 'ESRCH') return false;
      throw error;
    }
  };
  const deadline = Date.now() + input.boundMs;
  while (isAlive() && Date.now() < deadline)
    await new Promise((settle) => setTimeout(settle, 50));
  return isAlive();
};

/**
 * .what = the cache dir and the cache files in it for one profile name
 */
const getAllCacheFiles = (input: { home: string; profile: string }) => {
  const dir = join(input.home, '.rhachet', 'keyrack', 'cache', 'aws.export');
  if (!existsSync(dir)) return { dir, files: [] as string[] };
  const files = readdirSync(dir)
    .filter((name) => name.startsWith(`profile=${input.profile}.`))
    .filter((name) => name.endsWith('.json'))
    .map((name) => join(dir, name));
  return { dir, files };
};

/**
 * .what = run the op in its own node process, with the given env
 * .why = a separate process proves the single-flight holds across processes, not only
 *   across the promises of one
 */
const spawnExportProcess = (input: {
  env: Record<string, string>;
  profile: string;
  bounds: {
    lease: IsoDuration;
    wait: IsoDuration;
    hangGuard: IsoDuration;
  } | null;
}): {
  child: ChildProcess;
  done: Promise<{ code: number; stdout: string; stderr: string }>;
} => {
  const program = [
    `const { genAwsProfileExport } = require(${JSON.stringify(join(__dirname, 'genAwsProfileExport'))});`,
    `genAwsProfileExport({ profile: ${JSON.stringify(input.profile)}, refresh: false }, ${JSON.stringify(input.bounds ? { bounds: input.bounds } : {})})`,
    `  .then((result) => process.stdout.write(JSON.stringify(result)))`,
    `  .catch((error) => { console.error(error.message); process.exit(1); });`,
  ].join('\n');
  const child = spawn(process.execPath, ['-r', 'tsx/cjs', '-e', program], {
    env: { ...process.env, ...input.env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const done = new Promise<{ code: number; stdout: string; stderr: string }>(
    (settle, fail) => {
      // .note = deliberate mutation — stdout and stderr chunks accrue until the child exits
      // .note = settle on `exit`, not `close`: a killed holder's orphaned cli keeps the stderr
      //   pipe open until it ends, and `close` would wait on it
      let stdout = '';
      let stderr = '';
      child.stdout?.on('data', (chunk) => {
        stdout += String(chunk);
      });
      child.stderr?.on('data', (chunk) => {
        stderr += String(chunk);
      });
      child.on('error', fail);
      child.on('exit', (code) => settle({ code: code ?? -1, stdout, stderr }));
    },
  );
  return { child, done };
};

/**
 * .what = set process.env for the in-process calls of a case, and put it back after
 */
const useEnv = (input: { env: () => Record<string, string> }) => {
  const original = { ...process.env };
  beforeEach(() => {
    Object.assign(process.env, input.env());
  });
  afterEach(() => {
    for (const key of Object.keys(process.env))
      if (!(key in original)) delete process.env[key];
    Object.assign(process.env, original);
  });
};

const BOUNDS_FAST = {
  lease: { seconds: 2 },
  wait: { seconds: 15 },
  hangGuard: { seconds: 1 },
} as const satisfies Record<string, IsoDuration>;

describe('genAwsProfileExport', () => {
  given(
    '[case1] a burst of callers in separate processes, cache absent',
    () => {
      when('[t0] five processes ask for one profile at once', () => {
        const box = useBeforeAll(async () => {
          const fake = genFakeAwsBox({ slug: 'aws-export-c1' });
          const runs = Array.from({ length: 5 }, () =>
            spawnExportProcess({
              // a 3s export outlasts the spread of five node startups, so peers wait on it
              env: { ...fake.env, FAKE_AWS_SLEEP: '3' },
              profile: 'acme-burst',
              bounds: null,
            }),
          );
          const results = await Promise.all(runs.map((run) => run.done));
          return { fake, results };
        });

        then('every process succeeds', () => {
          expect(box.results.map((result) => result.code)).toEqual([
            0, 0, 0, 0, 0,
          ]);
        });

        then('the aws cli ran once, for the profile asked', () => {
          expect(
            getAllCalls({ calls: box.fake.calls }).map((call) => call.profile),
          ).toEqual(['acme-burst']);
        });

        then(
          'a waiter prints one wait notice, and no process prints aught else',
          () => {
            // the exporter prints naught; a waiter prints the one notice; a late caller that
            //   finds the cache warm prints naught. a credential value is never among them
            const isNotice = (one: string) =>
              /^ℹ another process exports aws credentials for profile acme-burst; this one will wait for it, up to .+ \(if the other process was killed, the wait ends on its own within .+\)\n$/.test(
                one,
              );
            const stderrs = box.results.map((result) => result.stderr);
            for (const stderr of stderrs)
              expect(stderr === '' || isNotice(stderr)).toEqual(true);
            const noticeCount = stderrs.filter(isNotice).length;
            expect(noticeCount).toBeGreaterThanOrEqual(1);
            expect(noticeCount).toBeLessThanOrEqual(4);

            // the distinct stderr a human could read across the burst, pinned for review
            // .note = the exporter always prints naught and a waiter always exists, so the set is stable
            expect({
              silentProcessesExist: stderrs.includes(''),
              noticesDistinct: [...new Set(stderrs.filter(isNotice))],
            }).toMatchSnapshot();
          },
        );

        then('all five got identical creds', () => {
          const parsed = box.results.map((result) => JSON.parse(result.stdout));
          expect(
            new Set(parsed.map((one) => JSON.stringify(one))).size,
          ).toEqual(1);
          expect(parsed[0].credentials.AWS_ACCESS_KEY_ID).toEqual(
            'AKIAFAKEKEY',
          );
        });
      });
    },
  );

  given('[case2] a warm cache', () => {
    const fake = genFakeAwsBox({ slug: 'aws-export-c2' });
    useEnv({ env: () => fake.env });

    when('[t0] a second caller asks after the first exported', () => {
      then('it reads the cache and spawns no cli', async () => {
        const first = await genAwsProfileExport({
          profile: 'acme-warm',
          refresh: false,
        });
        const second = await genAwsProfileExport({
          profile: 'acme-warm',
          refresh: false,
        });
        expect(second).toEqual(first);
        expect(getOneCallCount({ calls: fake.calls })).toEqual(1);
      });
    });
  });

  given('[case3] a cached value near its expiry', () => {
    const fake = genFakeAwsBox({ slug: 'aws-export-c3' });
    useEnv({
      env: () => ({
        ...fake.env,
        FAKE_AWS_EXPIRATION: asExpirationIn({ minutes: 2 }),
      }),
    });

    when('[t0] one caller asks again', () => {
      then('it re-exports', async () => {
        await genAwsProfileExport({ profile: 'acme-near', refresh: false });
        await genAwsProfileExport({ profile: 'acme-near', refresh: false });
        expect(getOneCallCount({ calls: fake.calls })).toEqual(2);
      });
    });

    when('[t1] a burst of callers asks for a near-expiry value', () => {
      then('the exports run one at a time, never at once', async () => {
        process.env.FAKE_AWS_SLEEP = '1';
        const callsBefore = getOneCallCount({ calls: fake.calls });
        const begun = Date.now();
        const results = await Promise.all(
          Array.from({ length: 3 }, () =>
            genAwsProfileExport({
              profile: 'acme-near-burst',
              refresh: false,
            }),
          ),
        );
        expect(results).toHaveLength(3);
        // each caller finds a near-expiry value under the key and re-exports in turn; three
        //   1s exports in turn take at least their sum, where three at once would take ~1s
        expect(getOneCallCount({ calls: fake.calls }) - callsBefore).toEqual(3);
        expect(Date.now() - begun).toBeGreaterThanOrEqual(2_900);
      });
    });
  });

  given('[case3.5] the fresh margin is fifteen minutes', () => {
    // either side of the margin: inside it re-exports, outside it serves the cache
    const MARGIN_CASES: { tn: string; minutes: number; exports: number }[] = [
      { tn: 't0', minutes: 10, exports: 2 },
      { tn: 't1', minutes: 20, exports: 1 },
    ];
    MARGIN_CASES.forEach((thisCase) =>
      given(`an export with ${thisCase.minutes} minutes of life`, () => {
        const fake = genFakeAwsBox({
          slug: `aws-export-c3p5-${thisCase.tn}`,
        });
        useEnv({
          env: () => ({
            ...fake.env,
            FAKE_AWS_EXPIRATION: asExpirationIn({
              minutes: thisCase.minutes,
            }),
          }),
        });

        when(`[${thisCase.tn}] a second caller asks`, () => {
          then(
            thisCase.exports === 2
              ? 'it re-exports: the value is inside the margin'
              : 'it reads the cache: the value is outside the margin',
            async () => {
              await genAwsProfileExport({
                profile: 'acme-margin',
                refresh: false,
              });
              await genAwsProfileExport({
                profile: 'acme-margin',
                refresh: false,
              });
              expect(getOneCallCount({ calls: fake.calls })).toEqual(
                thisCase.exports,
              );
            },
          );
        });
      }),
    );
  });

  given('[case4] a holder killed mid-export', () => {
    const fake = genFakeAwsBox({ slug: 'aws-export-c4' });
    useEnv({ env: () => fake.env });

    when('[t0] the next caller asks', () => {
      then('it proceeds once the lease lapses, and exports', async () => {
        // .note = a lease long enough that the caller meets the dead hold before it lapses, so the
        //         case proves a real wait (> 1s) and its notice
        const bounds = {
          lease: { seconds: 6 },
          wait: { seconds: 20 },
          hangGuard: { seconds: 1 },
        } as const satisfies Record<string, IsoDuration>;

        // a peer process takes the key and hangs in its export
        const holder = spawnExportProcess({
          env: { ...fake.env, FAKE_AWS_MODE: 'hang' },
          profile: 'acme-dead',
          bounds: { ...bounds, hangGuard: { seconds: 60 } },
        });
        await waitForCallCount({ calls: fake.calls, count: 1 });

        // kill it while it holds the key
        holder.child.kill('SIGKILL');
        await holder.done;

        // the next caller waits out the lease, then exports; its stderr is caught for review
        // .mock = process.stderr.write, for this one in-process call
        // .why = the notice is the assertion's subject; a spy reads it, and the silence keeps
        //        jest's own output clean. no behavior of the op is replaced
        // .real = [case1] reads the same notice off the real stderr of separate processes
        const stderrSpy = jest
          .spyOn(process.stderr, 'write')
          .mockImplementation(() => true);
        // .note = the calls are copied before the restore, since a restore clears them
        const begun = Date.now();
        const caught: { stderrs: string[] } = { stderrs: [] };
        const result = await genAwsProfileExport(
          { profile: 'acme-dead', refresh: false },
          { bounds },
        ).finally(() => {
          caught.stderrs = stderrSpy.mock.calls.map((call) => String(call[0]));
          stderrSpy.mockRestore();
        });
        expect(result.credentials.AWS_ACCESS_KEY_ID).toEqual('AKIAFAKEKEY');
        expect(Date.now() - begun).toBeGreaterThan(1000);
        expect(Date.now() - begun).toBeLessThan(toMilliseconds(bounds.wait));
        expect(getOneCallCount({ calls: fake.calls })).toEqual(2);

        // the one wait notice tells the human the wait ends on its own, and when
        expect(caught.stderrs).toEqual([
          'ℹ another process exports aws credentials for profile acme-dead; this one will wait for it, up to 20 seconds (if the other process was killed, the wait ends on its own within 6 seconds)\n',
        ]);
      });
    });
  });

  given('[case5] the cache at rest and the errors in flight', () => {
    const fake = genFakeAwsBox({ slug: 'aws-export-c5' });
    useEnv({ env: () => fake.env });

    when('[t0] an export is cached', () => {
      then('the file is 0600 in a 0700 dir', async () => {
        await genAwsProfileExport({ profile: 'acme-modes', refresh: false });
        const { dir, files } = getAllCacheFiles({
          home: fake.home,
          profile: 'acme-modes',
        });
        expect(files).toHaveLength(1);
        expect(statSync(dir).mode & 0o777).toEqual(0o700);
        expect(statSync(files[0]!).mode & 0o777).toEqual(0o600);
      });
    });

    when('[t0.5] the cache dir is extant with a looser mode', () => {
      then('the op tightens it back to 0700', async () => {
        await genAwsProfileExport({ profile: 'acme-modes', refresh: false });
        const { dir } = getAllCacheFiles({
          home: fake.home,
          profile: 'acme-modes',
        });
        chmodSync(dir, 0o755);

        // a warm read still ensures the dir first, so the mode is re-asserted
        await genAwsProfileExport({ profile: 'acme-modes', refresh: false });
        expect(statSync(dir).mode & 0o777).toEqual(0o700);
      });
    });

    when('[t1] the export returns too few keys', () => {
      then(
        'it throws with the key names and a hint, never the value',
        async () => {
          process.env.FAKE_AWS_MODE = 'incomplete';
          const error = await getError(
            genAwsProfileExport({
              profile: 'acme-incomplete',
              refresh: false,
            }),
          );
          expect(error).toBeInstanceOf(MalfunctionError);
          expect(error.message).toContain('acme-incomplete');
          expect(error.message).toContain('AWS_ACCESS_KEY_ID');
          expect(error.message).toContain('by hand');
          expect(error.message).not.toContain('AKIALEAKCHECKVALUE');
          expect(error.message).toMatchSnapshot();
          expect(asUnlockRowOf({ error, home: fake.home })).toMatchSnapshot();
          expect(
            getAllCacheFiles({ home: fake.home, profile: 'acme-incomplete' })
              .files,
          ).toEqual([]);
        },
      );
    });
  });

  given('[case6] an export that fails', () => {
    const fake = genFakeAwsBox({ slug: 'aws-export-c6' });
    useEnv({ env: () => ({ ...fake.env, FAKE_AWS_MODE: 'fail' }) });

    when('[t0] a caller asks', () => {
      then(
        'it throws with the profile and the fix, and writes no cache',
        async () => {
          const error = await getError(
            genAwsProfileExport({ profile: 'acme-fail', refresh: false }),
          );
          expect(error).toBeInstanceOf(MalfunctionError);
          expect(error.message).toContain('acme-fail');
          expect(error.message).toContain('expired');
          expect(error.message).toContain(
            "aws configure export-credentials --profile 'acme-fail'",
          );
          expect(error.message).toMatchSnapshot();

          // the row a human reads: the keyed retry first, then the hand-run for a fault that recurs
          const row = asUnlockRowOf({ error, home: fake.home });
          expect(row).toContain(
            '— retry: rhx keyrack unlock --env test --key AWS_PROFILE; if it recurs, run `aws configure export-credentials',
          );
          expect(row).toMatchSnapshot();
          expect(
            getAllCacheFiles({ home: fake.home, profile: 'acme-fail' }).files,
          ).toEqual([]);
        },
      );
    });

    when('[t1] two callers ask at once, and each export fails', () => {
      // .note = useThen, not useBeforeAll: the box env is set per test (useEnv), so the calls run in one
      const burst = useThen('the pair settles', async () => {
        process.env.FAKE_AWS_SLEEP = '1';
        const callsBefore = getOneCallCount({ calls: fake.calls });
        const begun = Date.now();
        const errors = await Promise.all(
          [0, 1].map(() =>
            getError(
              genAwsProfileExport({
                profile: 'acme-fail-pair',
                refresh: false,
              }),
            ),
          ),
        ).finally(() => {
          delete process.env.FAKE_AWS_SLEEP;
        });
        return {
          errors,
          calls: getOneCallCount({ calls: fake.calls }) - callsBefore,
          elapsedMs: Date.now() - begun,
        };
      });

      then('both throw the cli fault, with the profile', () => {
        for (const error of burst.errors) {
          expect(error).toBeInstanceOf(MalfunctionError);
          expect(error.message).toContain(
            'aws configure export-credentials failed',
          );
          expect(error.message).toContain('acme-fail-pair');
        }
      });

      then(
        'each ran its own export, one after the other, never at once',
        () => {
          // a failed export caches naught, so the waiter finds no value and exports in turn;
          //   two 1s exports in turn take at least their sum, where two at once would take ~1s
          expect(burst.calls).toEqual(2);
          expect(burst.elapsedMs).toBeGreaterThanOrEqual(1_900);
        },
      );

      then('no cache file is left for the profile', () => {
        expect(
          getAllCacheFiles({ home: fake.home, profile: 'acme-fail-pair' })
            .files,
        ).toEqual([]);
      });
    });
  });

  given('[case6.5] an export that fails under override config files', () => {
    const fake = genFakeAwsBox({ slug: 'aws-export-c6p5' });
    useEnv({
      env: () => ({
        ...fake.env,
        FAKE_AWS_MODE: 'incomplete',
        AWS_CONFIG_FILE: join(fake.home, 'alt.config'),
        AWS_SHARED_CREDENTIALS_FILE: join(fake.home, 'alt.credentials'),
      }),
    });

    when('[t0] a caller asks', () => {
      then(
        'the hand-run hint carries both overrides, so a human reruns the same config',
        async () => {
          const error = await getError(
            genAwsProfileExport({ profile: 'acme-alt', refresh: false }),
          );
          expect(error).toBeInstanceOf(MalfunctionError);
          expect(error.message).toContain(
            `AWS_CONFIG_FILE='${join(fake.home, 'alt.config')}' AWS_SHARED_CREDENTIALS_FILE='${join(fake.home, 'alt.credentials')}' aws configure export-credentials --profile 'acme-alt'`,
          );
          expect(
            asHomeMasked({ text: error.message, home: fake.home }),
          ).toMatchSnapshot();
        },
      );
    });
  });

  given('[case7] a refresh after a re-login', () => {
    const fake = genFakeAwsBox({ slug: 'aws-export-c7' });
    useEnv({ env: () => fake.env });

    when('[t0] the cache holds the pre-login creds', () => {
      then('a refresh replaces them, and reads no cache', async () => {
        process.env.FAKE_AWS_KEY = 'AKIABEFORE';
        await genAwsProfileExport({ profile: 'acme-login', refresh: false });

        // the new login mints new creds
        process.env.FAKE_AWS_KEY = 'AKIAAFTER';
        const refreshed = await genAwsProfileExport({
          profile: 'acme-login',
          refresh: true,
        });
        expect(refreshed.credentials.AWS_ACCESS_KEY_ID).toEqual('AKIAAFTER');

        // a later read gets the post-login creds from the cache
        const read = await genAwsProfileExport({
          profile: 'acme-login',
          refresh: false,
        });
        expect(read.credentials.AWS_ACCESS_KEY_ID).toEqual('AKIAAFTER');
        expect(getOneCallCount({ calls: fake.calls })).toEqual(2);
      });
    });

    when('[t1] the refresh export fails', () => {
      then('no pre-login creds are left in the cache', async () => {
        process.env.FAKE_AWS_KEY = 'AKIABEFORE';
        await genAwsProfileExport({
          profile: 'acme-relogin',
          refresh: false,
        });

        process.env.FAKE_AWS_MODE = 'fail';
        const error = await getError(
          genAwsProfileExport({ profile: 'acme-relogin', refresh: true }),
        );
        expect(error).toBeInstanceOf(MalfunctionError);
        expect(error.message).toContain(
          "aws configure export-credentials --profile 'acme-relogin'",
        );
        expect(
          getAllCacheFiles({ home: fake.home, profile: 'acme-relogin' }).files,
        ).toEqual([]);
      });
    });

    when('[t2] a read caller arrives while a refresh holds the key', () => {
      then(
        'it gets the post-login creds, never the pre-login ones',
        async () => {
          process.env.FAKE_AWS_KEY = 'AKIABEFORE';
          await genAwsProfileExport({
            profile: 'acme-relogin-queue',
            refresh: false,
          });

          process.env.FAKE_AWS_KEY = 'AKIAAFTER';
          process.env.FAKE_AWS_SLEEP = '1';
          const callsBefore = getOneCallCount({ calls: fake.calls });
          const refresh = genAwsProfileExport({
            profile: 'acme-relogin-queue',
            refresh: true,
          });

          // the read starts only once the refresh's export runs, so it holds the key
          await waitForCallCount({ calls: fake.calls, count: callsBefore + 1 });
          const read = await genAwsProfileExport({
            profile: 'acme-relogin-queue',
            refresh: false,
          });
          await refresh;
          expect(read.credentials.AWS_ACCESS_KEY_ID).toEqual('AKIAAFTER');
        },
      );
    });

    when('[t3] a refresh must queue behind a peer that holds the key', () => {
      then(
        'it drops the pre-login entry before it queues, so no reader in the wait gets it',
        async () => {
          process.env.FAKE_AWS_KEY = 'AKIABEFORE';
          process.env.FAKE_AWS_SLEEP = '0';
          await genAwsProfileExport({
            profile: 'acme-prequeue',
            refresh: false,
          });
          const { dir, files } = getAllCacheFiles({
            home: fake.home,
            profile: 'acme-prequeue',
          });
          const cachePath = files[0]!;

          // a peer that never drops the file holds the key: the file and the key share a name
          const gate = new EventEmitter();
          const held = new EventEmitter();
          const isHeld = once(held, 'held');
          const peer = withDiskMutex(
            {
              dir: join(dir, '.locks'),
              key: basename(cachePath, '.json'),
              lease: { minutes: 1 },
              wait: { seconds: 5 },
              onWait: null,
              asTimeoutError: ({ cause }) => cause,
            },
            async () => {
              held.emit('held');
              await once(gate, 'release');
            },
          );
          await isHeld;

          process.env.FAKE_AWS_KEY = 'AKIAAFTER';
          const callsBefore = getOneCallCount({ calls: fake.calls });
          try {
            const refresh = genAwsProfileExport({
              profile: 'acme-prequeue',
              refresh: true,
            });

            // the entry is gone while the refresh still waits; it ran no export yet
            await waitForFileAbsent({ path: cachePath });
            expect(getOneCallCount({ calls: fake.calls })).toEqual(callsBefore);

            gate.emit('release');
            await peer;
            const refreshed = await refresh;
            expect(refreshed.credentials.AWS_ACCESS_KEY_ID).toEqual(
              'AKIAAFTER',
            );
          } finally {
            gate.emit('release');
            await peer.catch(() => undefined);
          }
        },
      );
    });
  });

  given('[case8] one profile name under another config file', () => {
    const fake = genFakeAwsBox({ slug: 'aws-export-c8' });
    useEnv({ env: () => fake.env });

    when('[t0] the default config entry is warm', () => {
      then(
        'an override caller exports its own, and the default entry stays',
        async () => {
          process.env.FAKE_AWS_KEY = 'AKIADEFAULT';
          await genAwsProfileExport({ profile: 'acme-cfg', refresh: false });

          process.env.AWS_CONFIG_FILE = join(fake.home, 'other.config');
          process.env.FAKE_AWS_KEY = 'AKIAOVERRIDE';
          const override = await genAwsProfileExport({
            profile: 'acme-cfg',
            refresh: false,
          });
          expect(override.credentials.AWS_ACCESS_KEY_ID).toEqual(
            'AKIAOVERRIDE',
          );
          expect(getOneCallCount({ calls: fake.calls })).toEqual(2);

          delete process.env.AWS_CONFIG_FILE;
          const backToDefault = await genAwsProfileExport({
            profile: 'acme-cfg',
            refresh: false,
          });
          expect(backToDefault.credentials.AWS_ACCESS_KEY_ID).toEqual(
            'AKIADEFAULT',
          );
          expect(getOneCallCount({ calls: fake.calls })).toEqual(2);
        },
      );
    });

    when(
      '[t1] the default entry is warm and a caller names another credentials file',
      () => {
        then(
          'the override caller exports its own, and the default entry stays',
          async () => {
            process.env.FAKE_AWS_KEY = 'AKIADEFAULT';
            await genAwsProfileExport({
              profile: 'acme-creds',
              refresh: false,
            });
            const callsBefore = getOneCallCount({ calls: fake.calls });

            process.env.AWS_SHARED_CREDENTIALS_FILE = join(
              fake.home,
              'other.credentials',
            );
            process.env.FAKE_AWS_KEY = 'AKIAOVERRIDE';
            try {
              const override = await genAwsProfileExport({
                profile: 'acme-creds',
                refresh: false,
              });
              expect(override.credentials.AWS_ACCESS_KEY_ID).toEqual(
                'AKIAOVERRIDE',
              );
              expect(getOneCallCount({ calls: fake.calls })).toEqual(
                callsBefore + 1,
              );
            } finally {
              delete process.env.AWS_SHARED_CREDENTIALS_FILE;
            }

            // two identities, two files; the default one still serves from cache
            expect(
              getAllCacheFiles({ home: fake.home, profile: 'acme-creds' })
                .files,
            ).toHaveLength(2);
            const backToDefault = await genAwsProfileExport({
              profile: 'acme-creds',
              refresh: false,
            });
            expect(backToDefault.credentials.AWS_ACCESS_KEY_ID).toEqual(
              'AKIADEFAULT',
            );
            expect(getOneCallCount({ calls: fake.calls })).toEqual(
              callsBefore + 1,
            );
          },
        );
      },
    );
  });

  given('[case9] an export that hangs', () => {
    const fake = genFakeAwsBox({ slug: 'aws-export-c9' });
    useEnv({ env: () => ({ ...fake.env, FAKE_AWS_MODE: 'hang' }) });

    when('[t0] a caller asks', () => {
      then(
        'it fails loud at the hang guard, kills the cli, and writes no cache',
        async () => {
          const begun = Date.now();
          const error = await getError(
            genAwsProfileExport(
              { profile: 'acme-hang', refresh: false },
              { bounds: BOUNDS_FAST },
            ),
          );
          expect(error).toBeInstanceOf(MalfunctionError);
          expect(error.message).toContain('hung');
          expect(error.message).toContain('acme-hang');
          expect(error.message).toMatchSnapshot();
          expect(asUnlockRowOf({ error, home: fake.home })).toMatchSnapshot();
          expect(Date.now() - begun).toBeLessThan(10_000);
          expect(
            getAllCacheFiles({ home: fake.home, profile: 'acme-hang' }).files,
          ).toEqual([]);

          // the hung cli is gone, not orphaned; its own pid is the one the guard killed
          const [call] = getAllCalls({ calls: fake.calls });
          expect(
            await isPidAliveAfter({ pid: call!.pid, boundMs: 3_000 }),
          ).toEqual(false);
        },
      );
    });

    when('[t1] a waiter sits behind a holder that hangs past its bound', () => {
      then('the waiter fails loud past its wait bound', async () => {
        const callsBefore = getOneCallCount({ calls: fake.calls });
        const holder = genAwsProfileExport(
          { profile: 'acme-hang-queue', refresh: false },
          {
            bounds: {
              lease: { seconds: 5 },
              wait: { seconds: 15 },
              hangGuard: { seconds: 4 },
            },
          },
        ).catch((error: Error) => error);

        // the waiter asks only once the holder's cli runs, so the holder provably holds the key
        await waitForCallCount({ calls: fake.calls, count: callsBefore + 1 });
        const error = await getError(
          genAwsProfileExport(
            { profile: 'acme-hang-queue', refresh: false },
            {
              bounds: {
                lease: { seconds: 5 },
                wait: { seconds: 1 },
                hangGuard: { seconds: 4 },
              },
            },
          ),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('acme-hang-queue');
        expect(error.message).toMatchSnapshot();
        expect(asUnlockRowOf({ error, home: fake.home })).toMatchSnapshot();
        expect(await holder).toBeInstanceOf(MalfunctionError);
      });
    });
  });

  given('[case13] a profile name that holds shell syntax', () => {
    const fake = genFakeAwsBox({ slug: 'aws-export-c13' });
    useEnv({ env: () => fake.env });

    when('[t0] a caller asks for it', () => {
      then(
        'the cli gets the name as one literal word, and no command in it runs',
        async () => {
          const profile = 'acme-$(id)`id`';
          await genAwsProfileExport({ profile, refresh: false });
          expect(
            getAllCalls({ calls: fake.calls }).map((c) => c.profile),
          ).toEqual([profile]);
        },
      );
    });
  });

  given(
    '[case12] a cache file of this identity that is not a whole entry',
    () => {
      const fake = genFakeAwsBox({ slug: 'aws-export-c12' });
      useEnv({ env: () => fake.env });

      const CASES: {
        description: string;
        reshape: (entry: Record<string, unknown>) => Record<string, unknown>;
      }[] = [
        {
          description: 'it lacks AWS_ACCESS_KEY_ID',
          reshape: (entry) => ({
            ...entry,
            credentials: { AWS_SECRET_ACCESS_KEY: 'secret-of-AKIASTALE' },
          }),
        },
        {
          description: 'it lacks AWS_SECRET_ACCESS_KEY',
          reshape: (entry) => ({
            ...entry,
            credentials: { AWS_ACCESS_KEY_ID: 'AKIASTALE' },
          }),
        },
        {
          description: 'its credentials are not an object',
          reshape: (entry) => ({ ...entry, credentials: 'AKIASTALE' }),
        },
        {
          description: 'its expiresAt is not an iso timestamp',
          reshape: (entry) => ({
            ...entry,
            credentials: {
              AWS_ACCESS_KEY_ID: 'AKIASTALE',
              AWS_SECRET_ACCESS_KEY: 'secret-of-AKIASTALE',
            },
            expiresAt: 'tomorrow',
          }),
        },
      ];

      CASES.forEach((thisCase, index) =>
        when(`[t${index}] ${thisCase.description}`, () => {
          then(
            'it counts as absent; the caller exports and overwrites it',
            async () => {
              const profile = `acme-partial-${index}`;
              await genAwsProfileExport({ profile, refresh: false });
              const { files } = getAllCacheFiles({ home: fake.home, profile });
              const entry = JSON.parse(readFileSync(files[0]!, 'utf8'));
              writeFileSync(files[0]!, JSON.stringify(thisCase.reshape(entry)));

              const callsBefore = getOneCallCount({ calls: fake.calls });
              const result = await genAwsProfileExport({
                profile,
                refresh: false,
              });
              expect(result.credentials.AWS_ACCESS_KEY_ID).toEqual(
                'AKIAFAKEKEY',
              );
              expect(
                getOneCallCount({ calls: fake.calls }) - callsBefore,
              ).toEqual(1);
              expect(
                JSON.parse(readFileSync(files[0]!, 'utf8')).credentials
                  .AWS_ACCESS_KEY_ID,
              ).toEqual('AKIAFAKEKEY');
            },
          );
        }),
      );
    },
  );

  given('[case10] a corrupt cache file', () => {
    const fake = genFakeAwsBox({ slug: 'aws-export-c10' });
    useEnv({ env: () => fake.env });

    when('[t0] a caller asks', () => {
      then('it exports and overwrites the bad file', async () => {
        await genAwsProfileExport({
          profile: 'acme-corrupt',
          refresh: false,
        });
        const { files } = getAllCacheFiles({
          home: fake.home,
          profile: 'acme-corrupt',
        });
        writeFileSync(files[0]!, '{ not json');

        const result = await genAwsProfileExport({
          profile: 'acme-corrupt',
          refresh: false,
        });
        expect(result.credentials.AWS_ACCESS_KEY_ID).toEqual('AKIAFAKEKEY');
        expect(getOneCallCount({ calls: fake.calls })).toEqual(2);
        expect(() => JSON.parse(readFileSync(files[0]!, 'utf8'))).not.toThrow();
      });
    });

    // each identity field the entry records, set to another identity's value
    const FOREIGN_FIELDS: { field: string; tn: string }[] = [
      { field: 'configPath', tn: 't1' },
      { field: 'credentialsPath', tn: 't2' },
      { field: 'profile', tn: 't3' },
    ];
    FOREIGN_FIELDS.forEach(({ field, tn }) =>
      when(`[${tn}] the file at this name records another ${field}`, () => {
        then(
          'its creds are never returned; the caller exports its own',
          async () => {
            const profile = `acme-foreign-${field.toLowerCase()}`;
            await genAwsProfileExport({ profile, refresh: false });
            const { files } = getAllCacheFiles({ home: fake.home, profile });

            // a whole, unexpired entry, but of another identity
            const entry = JSON.parse(readFileSync(files[0]!, 'utf8'));
            writeFileSync(
              files[0]!,
              JSON.stringify({
                ...entry,
                [field]: join(fake.home, `foreign.${field}`),
                credentials: {
                  ...entry.credentials,
                  AWS_ACCESS_KEY_ID: 'AKIAFOREIGN',
                },
              }),
            );

            const callsBefore = getOneCallCount({ calls: fake.calls });
            const result = await genAwsProfileExport({
              profile,
              refresh: false,
            });
            expect(result.credentials.AWS_ACCESS_KEY_ID).toEqual('AKIAFAKEKEY');
            expect(
              getOneCallCount({ calls: fake.calls }) - callsBefore,
            ).toEqual(1);
          },
        );
      }),
    );
  });

  given('[case11] a cache act that the disk refuses', () => {
    const fake = genFakeAwsBox({ slug: 'aws-export-c11' });
    useEnv({ env: () => fake.env });

    when('[t0] a dir takes the cache file path mid-export', () => {
      then(
        'it throws with the path and the disk error, never a value, and leaves no temp',
        async () => {
          // warm the entry, so its path is known
          await genAwsProfileExport({ profile: 'acme-wfault', refresh: false });
          const { dir, files } = getAllCacheFiles({
            home: fake.home,
            profile: 'acme-wfault',
          });
          const cachePath = files[0]!;

          // a refresh drops the file; the cli then makes a dir at its path, so the rename fails
          process.env.FAKE_AWS_MKDIR = cachePath;
          const error = await getError(
            genAwsProfileExport({ profile: 'acme-wfault', refresh: true }),
          );
          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.message).toContain('aws export cache write failed');
          expect(error.message).toContain(cachePath);
          expect(error.message).toContain('acme-wfault');
          expect(error.message).not.toContain('secret-of-');
          expect(error.message).not.toContain('token-of-');
          expect(
            asHomeMasked({ text: error.message, home: fake.home })
              .replace(
                /acme-wfault\.[0-9a-f]{8}\.json/g,
                'acme-wfault.<sha8>.json',
              )
              .replace(/\.[0-9]+\.[0-9a-f]{8}\.tmp/g, '.<pid>.<rand>.tmp'),
          ).toMatchSnapshot();

          // no temp file is left beside the path
          expect(
            readdirSync(dir).filter((name) => name.endsWith('.tmp')),
          ).toEqual([]);
        },
      );
    });

    when('[t1] a file takes the cache dir path', () => {
      then(
        'it throws with the dir path and the disk error, and runs no export',
        async () => {
          // a plain file where the cache dir must be, so the dir ensure fails
          const cacheDir = join(
            fake.home,
            '.rhachet',
            'keyrack',
            'cache',
            'aws.export',
          );
          rmSync(cacheDir, { recursive: true, force: true });
          writeFileSync(cacheDir, 'not a dir');
          const callsBefore = getOneCallCount({ calls: fake.calls });

          const error = await getError(
            genAwsProfileExport({ profile: 'acme-dfault', refresh: false }),
          );
          expect(error).toBeInstanceOf(ConstraintError);
          // the header names the file in the way, never a mode change a chmod could make
          expect(error.message).toContain(
            'a file blocks the aws export cache dir',
          );
          expect(error.message).not.toContain('owner-only');
          expect(error.message).toContain(cacheDir);
          expect(error.message).toContain('acme-dfault');
          expect(
            asHomeMasked({ text: error.message, home: fake.home }),
          ).toMatchSnapshot();

          // the row a human reads names the path and the cure for a wrong-kind entry (a move,
          // never a mode change), and never a bare retry
          const row = asUnlockRowOf({ error, home: fake.home });
          expect(row).toContain(
            '— fix: move aside the file at <home>/.rhachet/keyrack/cache/aws.export, then retry',
          );
          expect(row).not.toContain('readable and writable');
          expect(row).not.toContain('— retry');
          expect(row).toMatchSnapshot();
          expect(getOneCallCount({ calls: fake.calls })).toEqual(callsBefore);
          rmSync(cacheDir, { force: true });
        },
      );
    });

    // a dir where the cache file must be: a refresh cannot drop it, a read cannot read it
    const DIR_AT_FILE_CASES: {
      tn: string;
      act: string;
      refresh: boolean;
      message: string;
    }[] = [
      {
        tn: 't2',
        act: 'a refresh',
        refresh: true,
        message: 'aws export cache drop failed',
      },
      {
        tn: 't3',
        act: 'a read',
        refresh: false,
        message: 'aws export cache read failed',
      },
    ];
    DIR_AT_FILE_CASES.forEach((thisCase) =>
      when(
        `[${thisCase.tn}] ${thisCase.act} meets a dir at the cache file path`,
        () => {
          then(
            'it throws with the path and the disk error, never a value, and runs no export',
            async () => {
              delete process.env.FAKE_AWS_MKDIR;
              const profile = `acme-dirat-${thisCase.tn}`;
              await genAwsProfileExport({ profile, refresh: false });
              const { files } = getAllCacheFiles({ home: fake.home, profile });
              const cachePath = files[0]!;
              rmSync(cachePath, { force: true });
              mkdirSync(cachePath);
              const callsBefore = getOneCallCount({ calls: fake.calls });

              const error = await getError(
                genAwsProfileExport({ profile, refresh: thisCase.refresh }),
              );
              expect(error).toBeInstanceOf(ConstraintError);
              expect(error.message).toContain(thisCase.message);
              expect(error.message).toContain(cachePath);
              expect(error.message).not.toContain('secret-of-');
              expect(
                asHomeMasked({ text: error.message, home: fake.home }).replace(
                  /\.[0-9a-f]{8}\.json/g,
                  '.<sha8>.json',
                ),
              ).toMatchSnapshot();
              expect(getOneCallCount({ calls: fake.calls })).toEqual(
                callsBefore,
              );
              rmSync(cachePath, { recursive: true, force: true });
            },
          );
        },
      ),
    );

    when('[t4] the config file the identity reads is a dir', () => {
      then(
        'it throws with the config path and the disk code, and runs no export',
        async () => {
          delete process.env.FAKE_AWS_MKDIR;
          const configPath = join(fake.home, 'config-is-a-dir');
          mkdirSync(configPath, { recursive: true });
          process.env.AWS_CONFIG_FILE = configPath;
          const callsBefore = getOneCallCount({ calls: fake.calls });

          const error = await getError(
            genAwsProfileExport({ profile: 'acme-cfgdir', refresh: false }),
          ).finally(() => {
            delete process.env.AWS_CONFIG_FILE;
          });
          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.message).toContain('aws config file could not be read');
          expect(error.message).toContain(
            `make ${configPath} readable by this user, then retry; the disk said EISDIR`,
          );
          expect(
            asHomeMasked({ text: error.message, home: fake.home }),
          ).toMatchSnapshot();
          expect(asUnlockRowOf({ error, home: fake.home })).toMatchSnapshot();
          expect(getOneCallCount({ calls: fake.calls })).toEqual(callsBefore);
        },
      );
    });
  });

  given('[case14] a relock drops the cached exports of one profile', () => {
    const fake = genFakeAwsBox({ slug: 'aws-export-c14' });
    useEnv({ env: () => fake.env });

    when(
      '[t0] the profile is cached under two config files, beside a peer profile',
      () => {
        then(
          'the drop removes both of its files, keeps the peer, and the next read re-exports',
          async () => {
            // cache `acme` under the default config and under an override, and `acme.prod` beside it
            await genAwsProfileExport({ profile: 'acme', refresh: false });
            process.env.AWS_CONFIG_FILE = join(fake.home, 'alt.config');
            await genAwsProfileExport({ profile: 'acme', refresh: false });
            delete process.env.AWS_CONFIG_FILE;
            await genAwsProfileExport({ profile: 'acme.prod', refresh: false });
            expect(
              getAllCacheFiles({
                home: fake.home,
                profile: 'acme',
              }).files.filter((path) =>
                /profile=acme\.[0-9a-f]{8}\.json$/.test(path),
              ),
            ).toHaveLength(2);
            const callsBefore = getOneCallCount({ calls: fake.calls });

            // drop
            delAwsProfileExport({ profile: 'acme' });

            // both of acme's files are gone; acme.prod's file stays
            const remained = getAllCacheFiles({
              home: fake.home,
              profile: 'acme',
            })
              .files.map((path) => basename(path))
              .map((name) =>
                name.replace(/\.[0-9a-f]{8}\.json$/, '.<sha8>.json'),
              );
            expect(remained).toEqual(['profile=acme.prod.<sha8>.json']);

            // the next read of acme exports anew; acme.prod still reads its cache
            await genAwsProfileExport({ profile: 'acme', refresh: false });
            await genAwsProfileExport({ profile: 'acme.prod', refresh: false });
            expect(getOneCallCount({ calls: fake.calls })).toEqual(
              callsBefore + 1,
            );
          },
        );
      },
    );

    when('[t1] the profile was never cached', () => {
      then('the drop is a no-op', () => {
        expect(() =>
          delAwsProfileExport({ profile: 'acme-never' }),
        ).not.toThrow();
      });
    });

    when('[t2] a dir sits at the cache file path of the profile', () => {
      then(
        'the drop throws with the cache dir, the move that cures it, and the disk error',
        async () => {
          // cache the profile, then put a dir where its cache file was
          await genAwsProfileExport({
            profile: 'acme-dropfault',
            refresh: false,
          });
          const { files } = getAllCacheFiles({
            home: fake.home,
            profile: 'acme-dropfault',
          });
          const cachePath = files[0]!;
          rmSync(cachePath, { force: true });
          mkdirSync(cachePath);

          const error = getError(() =>
            delAwsProfileExport({ profile: 'acme-dropfault' }),
          );
          expect(error).toBeInstanceOf(ConstraintError);
          expect(error.message).toContain('aws export cache drop failed');
          expect(error.message).toContain('move aside the dir at');
          expect(error.message).not.toContain('readable and writable');
          expect(
            asHomeMasked({ text: error.message, home: fake.home }).replace(
              /\.[0-9a-f]{8}\.json/g,
              '.<sha8>.json',
            ),
          ).toMatchSnapshot();
          rmSync(cachePath, { recursive: true, force: true });
        },
      );
    });
  });

  given('[case15] the expiry the cli names, in the form it prints', () => {
    const fake = genFakeAwsBox({ slug: 'aws-export-c15' });

    when('[t0] the cli prints the expiry with a `+00:00` offset', () => {
      // the real cli prints python's `isoformat()`, so the offset form is the common case
      const instant = new Date(Date.now() + 40 * 60 * 1000);
      instant.setUTCMilliseconds(0);
      const offsetForm = instant.toISOString().replace('.000Z', '+00:00');
      useEnv({ env: () => ({ ...fake.env, FAKE_AWS_EXPIRATION: offsetForm }) });

      then(
        'the cached and returned expiry is that instant, never the fallback',
        async () => {
          const result = await genAwsProfileExport({
            profile: 'acme-offset',
            refresh: false,
          });
          expect(new Date(result.expiresAt).getTime()).toEqual(
            instant.getTime(),
          );
          expect(result.expiresAt.endsWith('Z')).toEqual(true);

          // the entry on disk holds the same instant, so a warm read serves it too
          const warm = await genAwsProfileExport({
            profile: 'acme-offset',
            refresh: false,
          });
          expect(warm.expiresAt).toEqual(result.expiresAt);
          expect(getOneCallCount({ calls: fake.calls })).toEqual(1);
        },
      );
    });

    when('[t1] the cli names an expiry that does not parse', () => {
      useEnv({ env: () => ({ ...fake.env, FAKE_AWS_EXPIRATION: 'soon' }) });

      then(
        'it fails loud with the profile and the value, and writes no cache',
        async () => {
          const error = await getError(
            genAwsProfileExport({ profile: 'acme-badexp', refresh: false }),
          );
          expect(error).toBeInstanceOf(MalfunctionError);
          expect(error.message).toContain(
            'named an expiry that does not parse',
          );
          expect(error.message).toContain('acme-badexp');
          expect(error.message).not.toContain('secret-of-');
          expect(
            asHomeMasked({ text: error.message, home: fake.home }),
          ).toMatchSnapshot();
          expect(asUnlockRowOf({ error, home: fake.home })).toMatchSnapshot();
          expect(
            getAllCacheFiles({ home: fake.home, profile: 'acme-badexp' }).files,
          ).toEqual([]);
        },
      );
    });
  });

  given('[case16] a profile re-pointed under the same config path', () => {
    const fake = genFakeAwsBox({ slug: 'aws-export-c16' });
    const configPath = join(fake.home, 'repoint.config');
    useEnv({ env: () => ({ ...fake.env, AWS_CONFIG_FILE: configPath }) });

    when(
      '[t0] the config is edited to point the profile at another account',
      () => {
        then(
          'the next read re-exports, and the prior config reads its own entry',
          async () => {
            // export under account A
            writeFileSync(
              configPath,
              '[profile acme-repoint]\nsso_account_id = 111111111111\n',
            );
            await genAwsProfileExport({
              profile: 'acme-repoint',
              refresh: false,
            });
            expect(getOneCallCount({ calls: fake.calls })).toEqual(1);

            // re-point the profile at account B under the same path; a warm entry must not serve it
            writeFileSync(
              configPath,
              '[profile acme-repoint]\nsso_account_id = 222222222222\n',
            );
            await genAwsProfileExport({
              profile: 'acme-repoint',
              refresh: false,
            });
            expect(getOneCallCount({ calls: fake.calls })).toEqual(2);

            // back to account A: its entry still has life, so no export runs
            writeFileSync(
              configPath,
              '[profile acme-repoint]\nsso_account_id = 111111111111\n',
            );
            await genAwsProfileExport({
              profile: 'acme-repoint',
              refresh: false,
            });
            expect(getOneCallCount({ calls: fake.calls })).toEqual(2);
          },
        );
      },
    );
  });
});
