import { type ChildProcess, spawn } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ConstraintError, MalfunctionError } from 'helpful-errors';
import {
  genTestUuid,
  getError,
  getOneTempDirRoot,
  given,
  then,
  useBeforeAll,
  when,
} from 'test-fns';

import configAcceptance from '../../../jest.acceptance.config';
import configIntegration from '../../../jest.integration.config';
import configUnit from '../../../jest.unit.config';
import { genTempDirPhysical, TEST_REPO_ROOT } from './genTempDirPhysical';

const PROBES = '<rootDir>/src/.test/assets/tempdir-clamp/probe.*.ts';
const PROBES_REPO = '<rootDir>/src/.test/assets/tempdir-clamp/repo/probe.*.ts';
const CONFIG_UNIT = 'jest.unit.config.ts';
const CONFIG_INTEGRATION = 'jest.integration.config.ts';
const CONFIG_ACCEPTANCE = 'jest.acceptance.config.ts';
const CONFIG_UNWIRED = 'src/.test/assets/tempdir-clamp/jest.unwired.config.ts';
const CONFIG_INTEGRATION_KEYLESS =
  'src/.test/assets/tempdir-clamp/jest.integration.keyless.config.ts';

/**
 * .what = the hint every harness fault names
 * .why = a harness fault is the clamp's own, so its next move is to re-run the case alone and
 *        read the nested run's output, which each fault carries
 */
const HINT_RERUN =
  're-run the case alone: rhx test.under-unit-config --file src/.test/infra/genTempDirPhysical.integration.test.ts --name <case>; the nested output is in this error';

/**
 * .what = jest's own bin, never `npx`
 * .why = the child must BE the jest main process, so its exit code is jest's verdict rather
 *        than a wrapper's
 */
const JEST_BIN = join(TEST_REPO_ROOT, 'node_modules/.bin/jest');

/**
 * .what = the wall-clock cap on one nested run
 * .why = a nested run that never exits (the regression these clamps exist to catch) must fail
 *        the case with its output, never freeze the outer worker inside a sync spawn
 */
const NESTED_RUN_CAP_MS = 120_000;

/**
 * .what = signals a process group, and treats an already-gone group as done
 * .why = between a check that the group lives and the signal, it can exit; ESRCH then is
 *        the expected answer, never a fault. any other fault is reported loud, never thrown:
 *        a cleanup fault must never replace the error that sent control into a `finally`,
 *        nor crash a worker from inside a timer callback
 */
const killGroupUnlessGone = (input: {
  pid: number;
  signal: NodeJS.Signals;
}): void => {
  try {
    process.kill(-input.pid, input.signal);
  } catch (error) {
    // ESRCH = no such process (already gone): the expected answer
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ESRCH') return;
    console.error(
      '💥 MalfunctionError: tempdir-clamp could not signal its nested run group',
      { pid: input.pid, signal: input.signal, code, hint: HINT_RERUN },
    );
  }
};

/**
 * .what = a slug unique to one clamp case
 * .why = the temp root is shared with every live worker of this very run, so the
 *        clamp counts only the dirs that carry its own slug — a whole-root count
 *        would race its peers
 */
const genClampSlug = (input: { label: string }): string =>
  `tempdir-clamp-${input.label}-${genTestUuid().slice(0, 8)}`;

/**
 * .what = the probe dirs on disk under one slug
 * .why = the clamp's measure. the root is DERIVED from test-fns, never a literal,
 *        so a re-key of the root upstream cannot blind the count
 *        (rule.forbid.reads-outside-the-repo, .the one exception)
 * .note = matched as `<slug>.`, so a slug carried as a genTestTempRepo suffix
 *         (`rhachet-test-<slug>`) counts the same as a bare one
 */
const countDirsOfSlug = (input: { slug: string }): number =>
  readdirSync(getOneTempDirRoot().pathPhysical).filter((name) =>
    name.includes(`${input.slug}.`),
  ).length;

/**
 * .what = reads the run id of this clamp's own run, the one its teardown reclaims
 * .why = the hooks-removed control runs no setup, so its workers inherit this id and stamp
 *        their dirs with it; this run's teardown then reclaims them, and the clamp removes none
 */
const getClampRunId = (): string => {
  const run = process.env.TEST_FNS_RUN;
  if (!run)
    throw new ConstraintError('tempdir-clamp: this run has no test-fns run id', {
      hint: 'run the clamp under a config that wires the autoprune globalSetup (jest.integration.config.ts)',
    });
  return run;
};

/**
 * .what = reads the run id a held nested run reported
 * .why = the hold report names its run, and that id is what test-fns' teardown reclaims by
 */
const asHeldRunId = (input: { output: string }): string => {
  const found = /run: (r[a-f0-9]{8})/.exec(input.output)?.[1];
  if (!found)
    throw new MalfunctionError('tempdir-clamp: the held run never named its run id', {
      output: input.output,
      hint: HINT_RERUN,
    });
  return found;
};

/**
 * .what = releases a held nested run: test-fns' own teardown reclaims its dirs and marker
 * .why = the clamp never removes a dir itself (rule.forbid.reads-outside-the-repo grants it a
 *        count, never a removal); the reclaim stays the package's, scoped by the run stamp
 * .note = deliberate mutation: the teardown reads its run from the env, so this worker's own id
 *         is swapped out for the call and restored in finally, before any later allocation
 */
const delHeldRunViaTeardown = async (input: { run: string }): Promise<void> => {
  const runOriginal = process.env.TEST_FNS_RUN;
  process.env.TEST_FNS_RUN = input.run;
  try {
    const { default: teardown } = await import('test-fns/autoprune.teardown.jest');
    await teardown();
  } finally {
    if (runOriginal === undefined) delete process.env.TEST_FNS_RUN;
    if (runOriginal !== undefined) process.env.TEST_FNS_RUN = runOriginal;
  }
};

/**
 * .what = the env for a nested jest run
 * .why = the nested run must be a fresh run of its own, never a worker of ours, and it must
 *        not inherit the knobs that flip the verdict the clamp measures
 */
const genProbeEnv = (input: {
  slug: string;
  fail: string | null;
  holdMs: number;
  keep: boolean;
}): NodeJS.ProcessEnv => {
  const {
    JEST_WORKER_ID: _worker,
    TEST_FNS_KEEP: _keep,
    TEST_FNS_MAX_AGE_MS: _maxAge,
    ...env
  } = process.env;
  return {
    ...env,
    TEMPDIR_CLAMP_SLUG: input.slug,
    TEMPDIR_CLAMP_FAIL: input.fail ?? '',
    TEMPDIR_CLAMP_HOLD_MS: String(input.holdMs),
    ...(input.keep ? { TEST_FNS_KEEP: '1' } : {}),
    FORCE_COLOR: '0', // plain text, so the output reads as the words it asserts
  };
};

/**
 * .what = runs probe files in a nested jest run, to completion, under a wall-clock cap
 * .why = every clamp case measures what a whole nested run leaves behind, so the run must
 *        finish before the count; the cap turns a hung run into a named fault with its output
 * .note = detached, so the cap kills the whole process GROUP — the jest main AND its workers.
 *         a kill of the main alone would orphan workers whose dirs no teardown then reclaims
 */
const runProbes = async (input: {
  config: string;
  probes: string;
  slug: string;
  fail: string | null;
  scope: string | null;
  keep: boolean;
}): Promise<{ status: number | null; output: string }> => {
  const child = spawn(
    JEST_BIN,
    [
      '-c',
      input.config,
      '--testMatch',
      input.probes,
      '--maxWorkers=2',
      ...(input.scope ? ['--testPathPatterns', input.scope] : []),
    ],
    {
      cwd: TEST_REPO_ROOT,
      env: genProbeEnv({
        slug: input.slug,
        fail: input.fail,
        holdMs: 0,
        keep: input.keep,
      }),
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  // .note = deliberate mutation: a child streams its output over time, so the buffer accumulates
  const chunks: string[] = [];
  child.stdout?.on('data', (chunk) => chunks.push(String(chunk)));
  child.stderr?.on('data', (chunk) => chunks.push(String(chunk)));
  const output = (): string => chunks.join('');
  const context = { config: input.config, slug: input.slug, capMs: NESTED_RUN_CAP_MS };

  return new Promise((settle, fail) => {
    const cap = setTimeout(() => {
      if (child.pid !== undefined) killGroupUnlessGone({ pid: child.pid, signal: 'SIGKILL' });
      fail(
        new MalfunctionError('tempdir-clamp: the nested probe run did not finish', {
          ...context,
          output: output(),
          hint: HINT_RERUN,
        }),
      );
    }, NESTED_RUN_CAP_MS);
    child.once('error', (error) => {
      clearTimeout(cap);
      fail(
        new MalfunctionError('tempdir-clamp: the nested probe run never spawned', {
          ...context,
          cause: error.message,
          hint: HINT_RERUN,
        }),
      );
    });
    child.once('close', (status) => {
      clearTimeout(cap);
      settle({ status, output: output() });
    });
  });
};

/**
 * .what = waits for a condition, bounded, and names what never came true
 * .why = a poll with no bound turns a broken premise into a hang; a bounded one turns it into a
 *        named fault, with the context to debug it
 */
const waitUntil = async (input: {
  isMet: () => boolean;
  withinMs: number;
  whatAwaited: string;
  context: () => Record<string, unknown>;
}): Promise<void> => {
  const deadline = Date.now() + input.withinMs;
  while (!input.isMet()) {
    if (Date.now() > deadline)
      throw new MalfunctionError(
        `tempdir-clamp: ${input.whatAwaited} never came true`,
        { ...input.context(), withinMs: input.withinMs, hint: HINT_RERUN },
      );
    await new Promise((done) => setTimeout(done, 200));
  }
};

/**
 * .what = whether a child process has exited
 * .why = a child that died by signal reports `signalCode`, not `exitCode`; either means gone
 */
const isExited = (input: { child: ChildProcess }): boolean =>
  input.child.exitCode !== null || input.child.signalCode !== null;

// each case drives a nested jest run, so a case takes seconds rather than ms
jest.setTimeout(180_000);

describe('genTempDirPhysical', () => {
  given('[case1] a temp dir is allocated', () => {
    when('[t0] the cwd is this repo', () => {
      const dir = genTempDirPhysical({ slug: 'tempdir-shape' });

      then('it exists, under the derived temp root', () => {
        expect(existsSync(dir)).toBe(true);
        expect(dir.startsWith(`${getOneTempDirRoot().pathPhysical}/`)).toBe(
          true,
        );
      });

      then('it sits physically outside this repo', () => {
        expect(dir.startsWith(`${TEST_REPO_ROOT}/`)).toBe(false);
      });
    });

    when('[t1] the cwd was moved into another git repo', () => {
      then('it refuses loud, and names the fix', async () => {
        const elsewhere = genTempDirPhysical({
          slug: 'tempdir-elsewhere',
          git: true,
        });
        const cwdOriginal = process.cwd();
        // .note = deliberate mutation: the case IS a moved cwd; restored in finally
        process.chdir(elsewhere);
        const error = await (async () => {
          try {
            return await getError(() =>
              genTempDirPhysical({ slug: 'tempdir-from-elsewhere' }),
            );
          } finally {
            process.chdir(cwdOriginal);
          }
        })();
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('from a cwd outside this repo');
        expect(error.message).toContain(
          'allocate the dir before the chdir, or chdir back first',
        );
        expect(process.cwd()).toEqual(cwdOriginal);
      });
    });
  });

  given('[case2] every jest config of this repo', () => {
    when('[t0] its hooks are read', () => {
      const configs = [
        { name: CONFIG_UNIT, config: configUnit },
        { name: CONFIG_INTEGRATION, config: configIntegration },
        { name: 'jest.acceptance.config.ts', config: configAcceptance },
      ];

      then('each wires the autoprune teardown', () => {
        for (const { name, config } of configs)
          expect({ name, globalTeardown: config.globalTeardown }).toEqual({
            name,
            globalTeardown: 'test-fns/autoprune.teardown.jest',
          });
      });

      then('each calls the one shared reclaim wire-up — so no tier can drift from another', () => {
        for (const { name, config } of configs) {
          // the failure names the config that lacks the hook, never a read of 'undefined'
          expect({ name, globalSetup: typeof config.globalSetup }).toEqual({
            name,
            globalSetup: 'string',
          });
          const source = readFileSync(
            join(TEST_REPO_ROOT, String(config.globalSetup)),
            'utf-8',
          );
          // the wire-up's own behavior is proven end to end by the nested runs below: the unit
          // tier ([case3], [case6]) and the acceptance tier ([case8][t1]) each run through it
          expect({
            name,
            wired: source.includes('await setAutopruneForRun({ globalConfig })'),
          }).toEqual({ name, wired: true });
        }
      });
    });
  });

  given('[case3] a run of three probe files across two workers', () => {
    when('[t0] the run passes', () => {
      const slug = genClampSlug({ label: 'pass' });
      const result = useBeforeAll(async () =>
        runProbes({ config: CONFIG_UNIT, probes: PROBES, slug, fail: null, scope: null, keep: false }),
      );

      then('the run passed, and allocated in every file', () => {
        // status and output in one assert, so a red run shows the output that names its cause
        expect(result).toMatchObject({
          status: 0,
          output: expect.stringContaining('3 passed, 3 total'),
        });
      });

      then('zero probe dirs survive it', () => {
        expect(countDirsOfSlug({ slug })).toEqual(0);
      });
    });

    when('[t1] a test fails after it allocated', () => {
      const slug = genClampSlug({ label: 'fail' });
      const result = useBeforeAll(async () =>
        runProbes({ config: CONFIG_UNIT, probes: PROBES, slug, fail: 'gamma', scope: null, keep: false }),
      );

      then('the run failed', () => {
        expect(result).toMatchObject({
          status: 1,
          output: expect.stringContaining('a deliberate failure'),
        });
      });

      then('zero probe dirs survive it', () => {
        expect(countDirsOfSlug({ slug })).toEqual(0);
      });
    });

    when('[t2] the run is scoped to one file', () => {
      const slug = genClampSlug({ label: 'scope' });
      const result = useBeforeAll(async () =>
        runProbes({ config: CONFIG_UNIT, probes: PROBES, slug, fail: null, scope: 'alpha', keep: false }),
      );

      then('only the scoped file ran', () => {
        expect(result).toMatchObject({
          status: 0,
          output: expect.stringContaining('1 passed, 1 total'),
        });
      });

      then('zero probe dirs survive it', () => {
        expect(countDirsOfSlug({ slug })).toEqual(0);
      });
    });
  });

  given('[case4] a peer run beside a live dir of ours', () => {
    when('[t0] the peer run completes', () => {
      then("the peer's teardown leaves our live dir untouched", async () => {
        const ours = genTempDirPhysical({ slug: 'tempdir-clamp-ours' });
        const slug = genClampSlug({ label: 'peer' });
        const result = await runProbes({ config: CONFIG_UNIT, probes: PROBES, slug, fail: null, scope: null, keep: false });
        // status and output in one assert, so a red run shows the output that names its cause
        expect(result).toMatchObject({ status: 0, output: expect.stringContaining('3 passed, 3 total') });
        expect(countDirsOfSlug({ slug })).toEqual(0);
        expect(existsSync(ours)).toBe(true);
      });
    });
  });

  given('[case5] the control: the same run with the hooks removed', () => {
    when('[t0] the run passes', () => {
      const slug = genClampSlug({ label: 'unwired' });
      const result = useBeforeAll(async () =>
        runProbes({ config: CONFIG_UNWIRED, probes: PROBES, slug, fail: null, scope: null, keep: false }),
      );
      then('every probe dir survives — so the count above can see a leak', () => {
        expect(result).toMatchObject({ status: 0, output: expect.stringContaining('3 passed, 3 total') });
        expect(countDirsOfSlug({ slug })).toEqual(6);
      });

      then("each survivor carries this clamp run's stamp, so this run's teardown reclaims it", () => {
        expect(countDirsOfSlug({ slug: `${getClampRunId()}.${slug}` })).toEqual(6);
      });
    });
  });

  given('[case6] a run interrupted mid-test', () => {
    when('[t0] the whole run gets SIGINT, as a ctrl-c sends it', () => {
      const slug = genClampSlug({ label: 'sigint' });

      then('zero probe dirs survive it, and the run still exits as interrupted', async () => {
        // 3 workers for 3 probe files: every probe allocates at once and holds, so all 6 dirs
        // are live together while the run is signaled. the hold (60s) far exceeds the time to
        // allocate (~seconds), and the allocation bound (30s) sits between the two
        const child = spawn(
          JEST_BIN,
          // --no-cache: with cached timings of fast probes, jest would run them in-band, one
          // at a time, and only the first file's dirs would ever be live at once
          ['-c', CONFIG_UNIT, '--testMatch', PROBES, '--maxWorkers=3', '--no-cache'],
          {
            cwd: TEST_REPO_ROOT,
            env: genProbeEnv({ slug, fail: null, holdMs: 60_000, keep: false }),
            detached: true, // its own process group, so the signal reaches it as a ctrl-c would
            stdio: ['ignore', 'pipe', 'pipe'],
          },
        );
        // capture the nested run's own words, so a red row names its cause
        // .note = deliberate mutation: a child streams its output over time, so the buffer accumulates
        const chunks: string[] = [];
        child.stdout?.on('data', (chunk) => chunks.push(String(chunk)));
        child.stderr?.on('data', (chunk) => chunks.push(String(chunk)));
        const output = (): string => chunks.join('');

        // a failed launch arrives as an 'error' event, never a throw; held, so this case names it
        // .note = deliberate mutation: the event lands a tick after the pid check, so its value
        //         cannot be a const return
        const spawnFault: { error: Error | null } = { error: null };
        child.once('error', (error) => {
          spawnFault.error = error;
        });

        // a spawn that never happened fails here, in ms, with its own cause
        const pid = child.pid;
        // the 'error' event lands on the next tick, so wait one before the fault reads its cause
        if (pid === undefined) await new Promise((done) => setImmediate(done));
        if (pid === undefined)
          throw new MalfunctionError('tempdir-clamp: the probe run never spawned', {
            config: CONFIG_UNIT,
            slug,
            cause: spawnFault.error?.message ?? null,
            hint: HINT_RERUN,
          });
        try {
          await waitUntil({
            isMet: () => countDirsOfSlug({ slug }) === 6,
            withinMs: 30_000,
            whatAwaited: 'every probe allocated its dirs',
            context: () => ({ slug, countDirs: countDirsOfSlug({ slug }), output: output() }),
          });
          if (isExited({ child }))
            throw new MalfunctionError('tempdir-clamp: the probe run exited before its interrupt', {
              slug,
              exitCode: child.exitCode,
              signalCode: child.signalCode,
              output: output(),
              hint: HINT_RERUN,
            });
          killGroupUnlessGone({ pid, signal: 'SIGINT' });
          await waitUntil({
            isMet: () => isExited({ child }),
            withinMs: 60_000,
            whatAwaited: 'the interrupted run exited',
            context: () => ({ slug, pid, output: output() }),
          });
        } finally {
          // reap what this case provoked, whatever happened above
          if (!isExited({ child })) killGroupUnlessGone({ pid, signal: 'SIGKILL' });
        }
        // jest itself answered the signal (130), rather than died of it (a signalCode)
        expect({
          exitCode: child.exitCode,
          signalCode: child.signalCode,
          countDirs: countDirsOfSlug({ slug }),
          output: output(),
        }).toMatchObject({ exitCode: 130, signalCode: null, countDirs: 0 });
      });
    });
  });

  given('[case7] a run held for inspection', () => {
    when('[t0] TEST_FNS_KEEP is set', () => {
      const slug = genClampSlug({ label: 'keep' });
      const result = useBeforeAll(async () =>
        runProbes({ config: CONFIG_UNIT, probes: PROBES, slug, fail: null, scope: null, keep: true }),
      );
      then('every probe dir survives the run, for a human to open', () => {
        expect(result).toMatchObject({ status: 0, output: expect.stringContaining('3 passed, 3 total') });
        expect(countDirsOfSlug({ slug })).toEqual(6);
      });

      then('the run says where the held dirs sit', () => {
        expect(result.output).toContain(getOneTempDirRoot().pathPhysical);
      });

      then("once released, test-fns' own teardown reclaims every held dir", async () => {
        await delHeldRunViaTeardown({ run: asHeldRunId({ output: result.output }) });
        expect(countDirsOfSlug({ slug })).toEqual(0);
      });
    });
  });

  given('[case8] genTestTempRepo — the allocator behind the blackbox suite', () => {
    when('[t0] a run under the integration tier allocates two temp test repos', () => {
      const slug = genClampSlug({ label: 'repo' });
      // the integration config minus its keyrack source: the subject reads no brain api key
      const result = useBeforeAll(async () =>
        runProbes({ config: CONFIG_INTEGRATION_KEYLESS, probes: PROBES_REPO, slug, fail: null, scope: null, keep: false }),
      );

      then('the run passed', () => {
        expect(result).toMatchObject({
          status: 0,
          output: expect.stringContaining('1 passed, 1 total'),
        });
      });

      then('zero temp test repos survive it', () => {
        expect(countDirsOfSlug({ slug })).toEqual(0);
      });
    });

    when('[t1] a run under the REAL acceptance config allocates two temp test repos', () => {
      const slug = genClampSlug({ label: 'repo-accept' });
      // the acceptance tier's own config, unaltered: its composed globalSetup (autoprune +
      // interrupt reclaim + a lenient keyrack source) and its teardown, exactly as the 432
      // blackbox calls meet them
      const result = useBeforeAll(async () =>
        runProbes({ config: CONFIG_ACCEPTANCE, probes: PROBES_REPO, slug, fail: null, scope: null, keep: false }),
      );

      then('the run passed', () => {
        expect(result).toMatchObject({
          status: 0,
          output: expect.stringContaining('1 passed, 1 total'),
        });
      });

      then('zero temp test repos survive it', () => {
        expect(countDirsOfSlug({ slug })).toEqual(0);
      });
    });
  });
});
