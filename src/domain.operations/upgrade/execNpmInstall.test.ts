import { given, then, when } from 'test-fns';

import { withCapturedStreams } from '@src/.test/assets/withCapturedStreams';

import {
  execNpmInstall,
  type NpmInstallLifecycleHooks,
  type NpmInstallTarget,
} from './execNpmInstall';
import type { spawnNpmInstall } from './spawnNpmInstall';

/**
 * 🚨 ZERO mocks. this file used to `jest.mock('node:child_process')` and read the arg vector
 *   off `mockSpawnSync.mock.calls`, so every row was checked against the mock's own record
 *   and a real `spawnSync` misuse stayed green (`rule.forbid.unit.remote-boundaries`).
 *
 *   `execNpmInstall` is an ORCHESTRATOR — print the plan, run ONE communicator, dispatch the
 *   extant classifiers — so the communicator is injected as a typed fake instead. the real
 *   spawn is exercised by `execNpmInstallLocal.integration.test.ts`, against a real install.
 */

/**
 * .what = a communicator stand-in that records its input and answers a clean exit
 * .why = the arg vector is the whole subject of these rows, and it is what the orchestrator
 *   HANDS the communicator. so the fake captures rather than asserts — each row reads the
 *   capture and states its own claim.
 *
 * ⚠️ typed as `typeof spawnNpmInstall`, never a hand-rolled shape. a stand-in the producer
 *   cannot emit would let this suite pass against a contract that does not exist — the exact
 *   trap `execUpgrade.test.ts`'s own note records for its error class
 */
const genSpawnThatRecords = (): {
  spawn: typeof spawnNpmInstall;
  getTaken: () => Parameters<typeof spawnNpmInstall>[0];
} => {
  // .note = deliberate mutation — a local capture of the one call, never escapes this closure
  let taken: Parameters<typeof spawnNpmInstall>[0] | null = null;
  return {
    spawn: (input) => {
      taken = input;
      return { status: 0, signal: null, error: undefined, output: '' };
    },
    getTaken: () => {
      if (taken === null)
        throw new Error('the communicator was never called at all');
      return taken;
    },
  };
};

/**
 * .what = runs one install against the recorded communicator and hands back the ARG VECTOR
 *
 * .why  = `asNpmInstallArgs` is private on purpose (it is one rule of the build, never a
 *   decision a caller may reach), so it is observed through the seam the orchestrator
 *   already hands its communicator.
 *
 * .note = the plan print is captured through `withCapturedStreams` — a REAL console
 *   redirect into in-memory sinks, never a `jest.spyOn(console, 'log')`. the suite stays
 *   quiet without a mock of a global i/o surface
 */
const asInstallArgs = async (input: {
  packageManager: 'pnpm' | 'npm';
  target: NpmInstallTarget;
  lifecycleHooks: NpmInstallLifecycleHooks;
}): Promise<string[]> => {
  const fake = genSpawnThatRecords();
  await withCapturedStreams({
    run: () =>
      execNpmInstall(
        {
          packageManager: input.packageManager,
          target: input.target,
          packagesLatest: ['rhachet@latest'],
          lifecycleHooks: input.lifecycleHooks,
          cwd: input.target === 'local' ? '/tmp/project' : null,
        },
        { spawn: fake.spawn },
      ),
  });
  return fake.getTaken().args;
};

describe('execNpmInstall', () => {
  /**
   * 🚨 THE CLAMP on the hook opt-out.
   *
   * the defect this guards is not a wrong flag — it is a flag nobody CHOSE. the local
   * arg vector used to carry a hard-coded `--ignore-scripts`, so every package on the
   * default upgrade path inherited an opt-out justified once, for role packages, long
   * before the next native dependency arrived to be broken by it.
   *
   * the cure lifted the decision into a required input. these rows are what keep it
   * lifted: if a future edit re-hardcodes the flag on either target, or omits it where a
   * caller asked for it, exactly one row below goes red and names which.
   *
   * .note = the four rows are DERIVED from the two unions rather than typed out, so a
   *   third target or a third hook value cannot be added without a row to cover it — the
   *   same discipline the upgrade-header clamp uses. a hand-typed list of four is a
   *   reader hand-maintained against a writer it does not own
   */
  given(
    '[case1] every (target, lifecycleHooks) pair the unions can express',
    () => {
      const targets: NpmInstallTarget[] = ['local', 'global'];
      const hooksAll: NpmInstallLifecycleHooks[] = ['run', 'skip'];

      targets.forEach((target) =>
        hooksAll.forEach((lifecycleHooks) =>
          when(
            `[t0] target=${target}, lifecycleHooks=${lifecycleHooks}`,
            () => {
              then(
                `the arg vector ${lifecycleHooks === 'skip' ? 'carries' : 'omits'} --ignore-scripts`,
                async () => {
                  const args = await asInstallArgs({
                    packageManager: 'pnpm',
                    target,
                    lifecycleHooks,
                  });

                  expect(args.includes('--ignore-scripts')).toBe(
                    lifecycleHooks === 'skip',
                  );

                  // the packages must survive the flag either way — a guard against a
                  // cure that satisfies the row above by loss of the install itself
                  expect(args).toContain('rhachet@latest');
                },
              );
            },
          ),
        ),
      );
    },
  );

  given(
    '[case2] the package managers spell the same request differently',
    () => {
      when('[t0] pnpm, global', () => {
        then('it is `add -g`, and the hook flag rides with it', async () => {
          expect(
            await asInstallArgs({
              packageManager: 'pnpm',
              target: 'global',
              lifecycleHooks: 'skip',
            }),
          ).toEqual(['add', '-g', '--ignore-scripts', 'rhachet@latest']);
        });
      });

      when('[t1] npm, global', () => {
        then(
          'it is `install -g`, and the hook flag rides with it',
          async () => {
            expect(
              await asInstallArgs({
                packageManager: 'npm',
                target: 'global',
                lifecycleHooks: 'skip',
              }),
            ).toEqual(['install', '-g', '--ignore-scripts', 'rhachet@latest']);
          },
        );
      });

      when('[t2] local, hooks run', () => {
        then(
          'it is a bare `install` — no flag of our own is imposed',
          async () => {
            expect(
              await asInstallArgs({
                packageManager: 'pnpm',
                target: 'local',
                lifecycleHooks: 'run',
              }),
            ).toEqual(['install', 'rhachet@latest']);
          },
        );
      });
    },
  );

  // 🚨 the arg vector is not all the orchestrator hands its communicator. a cure that
  //   carried the flags and dropped the cwd would satisfy every row above and install into
  //   the wrong tree — so the rest of the handoff is clamped too.
  given('[case3] the rest of the handoff, beyond the flags', () => {
    when('[t0] a LOCAL install', () => {
      then('the cwd it was given is carried to the communicator', async () => {
        const fake = genSpawnThatRecords();
        await withCapturedStreams({
          run: () =>
            execNpmInstall(
              {
                packageManager: 'pnpm',
                target: 'local',
                packagesLatest: ['rhachet@latest'],
                lifecycleHooks: 'run',
                cwd: '/tmp/project',
              },
              { spawn: fake.spawn },
            ),
        });
        expect(fake.getTaken().cwd).toEqual('/tmp/project');
        expect(fake.getTaken().packageManager).toEqual('pnpm');
      });
    });

    when('[t1] a GLOBAL install', () => {
      then('the null cwd is carried through, never invented', async () => {
        // 🚨 a global install belongs to no project, so it has no directory to name. a
        //   cure that substituted `process.cwd()` here would install a global package
        //   against a project's own store
        const fake = genSpawnThatRecords();
        await withCapturedStreams({
          run: () =>
            execNpmInstall(
              {
                packageManager: 'npm',
                target: 'global',
                packagesLatest: ['rhachet@latest'],
                lifecycleHooks: 'skip',
                cwd: null,
              },
              { spawn: fake.spawn },
            ),
        });
        expect(fake.getTaken().cwd).toEqual(null);
      });
    });
  });

  // 🚨 THE TWO DEATHS THAT LOOK ALIKE. `spawnSync` sets BOTH `error` and `signal` on a
  //   timeout kill AND on any other signal death, so a guard that reads that pair alone
  //   reports a package manager that SEGFAULTED as one that stalled — and hands its human
  //   *"check your network, then retry"* over a cause the network cannot explain. node draws
  //   the line with `error.code = 'ETIMEDOUT'`, set on the bound kill alone.
  //
  //   no row below holds without the others: [t0] alone passes on the over-broad guard, [t1]
  //   alone passes on a guard that never fires at all, and [t2] is the one that reddens the
  //   failhide.
  given('[case4] the child dies of a SIGNAL rather than an exit', () => {
    /**
     * .what = a communicator stand-in that answers one chosen structural death
     * .why  = the classification is the whole subject of these rows, and the classification
     *   reads `signal` / `error` / `status` — never bytes. so the fake answers the shape the
     *   real communicator would have returned, with no boundary crossed
     *
     * .note = typed as `typeof spawnNpmInstall`, per `genSpawnThatRecords`'s own note
     */
    const genSpawnThatDies = (input: {
      error: Error;
      signal: NodeJS.Signals;
      /**
       * .what = the bytes the child managed to write before it died
       * .why  = the default is a neutral progress line, which names no cause. `[t2]`
       *   overrides it, because WHICH bytes a crash leaves behind is that row's subject
       */
      output?: string;
    }): typeof spawnNpmInstall => {
      return () => ({
        status: null,
        signal: input.signal,
        error: input.error,
        output:
          input.output ?? 'Progress: resolved 41, reused 0, downloaded 12',
      });
    };

    const runGlobalInstall = async (
      spawn: typeof spawnNpmInstall,
    ): Promise<ReturnType<typeof execNpmInstall>> =>
      (
        await withCapturedStreams({
          run: () =>
            execNpmInstall(
              {
                packageManager: 'pnpm',
                target: 'global',
                packagesLatest: ['rhachet@latest'],
                lifecycleHooks: 'run',
                cwd: null,
              },
              { spawn },
            ),
        })
      ).result;

    when('[t0] the child was killed at its TIME BOUND', () => {
      then(
        'the outcome is `timed-out`, with no exit code invented',
        async () => {
          const outcome = await runGlobalInstall(
            genSpawnThatDies({
              error: Object.assign(new Error('spawnSync ETIMEDOUT'), {
                code: 'ETIMEDOUT',
              }),
              signal: 'SIGTERM',
            }),
          );

          expect(outcome.kind).toEqual('timed-out');
          // .why = the child never exited, so it has no code. null is the TRUTH
          expect(outcome.exitCode).toBeNull();
          // .why = the partial output is WHERE it stalled — the best evidence there is
          expect(outcome.output).toContain('resolved 41');
        },
      );
    });

    when('[t1] the child CRASHED — a segfault, not a stall', () => {
      then('it is NOT called a timeout; it reports as unplaced', async () => {
        // 🚨 the row that reddens the over-broad guard. a crash carries `error` and
        //   `signal` exactly as a timeout does, and no `ETIMEDOUT`. it must reach
        //   `unclassified` — we hold no row for a crash, and we say so
        //   (`rule.forbid.failhide`).
        //   .the mutation that reddens this: widen `isSpawnTimeoutError` to the
        //   error/signal pair
        const outcome = await runGlobalInstall(
          genSpawnThatDies({
            error: new Error('spawnSync failed'),
            signal: 'SIGSEGV',
          }),
        );

        expect(outcome.kind).toEqual('unclassified');
        expect(outcome.exitCode).toBeNull();
      });
    });

    when(
      '[t2] the child CRASHED after it printed the build-gate notice',
      () => {
        then('the crash is NEVER absolved as a gated build', async () => {
          // 🚨 THE FAILHIDE ROW. pnpm prints `ERR_PNPM_IGNORED_BUILDS` mid-install, so a
          //   crash afterward leaves that notice in the captured bytes — and a segfault
          //   writes no error code of its own. the gate notice then stands ALONE, which the
          //   TEXT classifier reads as `build-gate-blocked`, which `execNpmInstallGlobal`
          //   deliberately ABSOLVES as `{ upgraded: true }`: a crashed package manager,
          //   reported as a successful upgrade. the co-occurrence guard cannot save it — that
          //   guard hunts for a rival error code, and a crash leaves none.
          //
          //   the cure is to read the STRUCTURAL death BEFORE the text, as the timeout row
          //   does. .the mutation that reddens this: delete the `result.signal !== null ||
          //   result.error !== undefined` row from `execNpmInstall`
          const outcome = await runGlobalInstall(
            genSpawnThatDies({
              error: new Error('spawnSync failed'),
              signal: 'SIGSEGV',
              // the real pnpm notice, printed mid-install, then the process dies
              output: [
                'Progress: resolved 41, reused 0, downloaded 12',
                'ERR_PNPM_IGNORED_BUILDS  Ignored build scripts: node-pty.',
              ].join('\n'),
            }),
          );

          // the assertion that IS the clamp: the absolved kind must not be reached
          expect(outcome.kind).not.toEqual('build-gate-blocked');
          expect(outcome.kind).toEqual('unclassified');
        });
      },
    );
  });
});
