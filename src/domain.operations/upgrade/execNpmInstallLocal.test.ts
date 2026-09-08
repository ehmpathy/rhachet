import { given, then, when } from 'test-fns';

import type { ContextCli } from '@src/domain.objects/ContextCli';

import { withCapturedStreams } from '../../.test/assets/withCapturedStreams';
import type { detectPackageManager } from './execNpmInstallLocal';
import { execNpmInstallLocal } from './execNpmInstallLocal';
import type { spawnNpmInstall } from './spawnNpmInstall';

const context = { cwd: '/tmp/project' } as ContextCli;

/**
 * 🚨 ZERO mocks. this file used to `jest.mock('node:child_process')` AND `jest.mock('node:fs')`
 *   — two remote boundaries replaced by mocks, so no row could observe a real install or a
 *   real lockfile read (`rule.forbid.unit.remote-boundaries`). both are injected as typed
 *   fakes now; the real halves are exercised by `execNpmInstallLocal.integration.test.ts`.
 */

/** .what = a lockfile read that answers pnpm, with no filesystem touched */
const detectPnpm: typeof detectPackageManager = () => 'pnpm';

/**
 * .what = a communicator stand-in that answers a scripted outcome and records its input
 *
 * ⚠️ typed as `typeof spawnNpmInstall`, never a hand-rolled shape — a stand-in the producer
 *   cannot emit would let this suite pass against a contract that does not exist
 */
const genSpawnThatAnswers = (
  answer: ReturnType<typeof spawnNpmInstall>,
): {
  spawn: typeof spawnNpmInstall;
  getTaken: () => Parameters<typeof spawnNpmInstall>[0];
} => {
  // .note = deliberate mutation — a local capture of the one call, never escapes this closure
  let taken: Parameters<typeof spawnNpmInstall>[0] | null = null;
  return {
    spawn: (input) => {
      taken = input;
      return answer;
    },
    getTaken: () => {
      if (taken === null)
        throw new Error('the communicator was never called at all');
      return taken;
    },
  };
};

/**
 * .what = the one row of `execNpmInstallLocal` that no shipped call site can reach
 *
 * .why  = 🚨 THE CLAMP FOR A KEPT-FOR-TOMORROW BRANCH.
 *
 *   `execNpmInstallLocal` absolves `build-gate-blocked` and prints the gate note — but
 *   `execUpgrade`, its only production caller, passes `lifecycleHooks: 'skip'`, which
 *   spends `--ignore-scripts` and so guarantees pnpm's gate never fires. the branch is
 *   therefore live in the contract and dead on every shipped path.
 *
 *   ⚠️ a branch in that state is the worst of both: it cannot be observed in production,
 *   so no signal would warn us if it broke, AND it is one argument change away from real
 *   traffic. the reviewer put it exactly — "a future change may flip it on without any
 *   production signal".
 *
 *   the cure is not to delete it (the contract admits `'run'`, so a caller may legally
 *   arrive here) and not to force `execUpgrade` to run hooks (that trade belongs to the
 *   caller, per this operation's own doc-block). it is to make the branch EXERCISED, so
 *   the day it goes live it goes live verified.
 *
 * .note = the global target's twin rows are `execNpmInstallGlobal.test.ts` `[t1b]`. two
 *   files, one property — that a gated hook is absolved and REPORTED at both targets.
 */
describe('execNpmInstallLocal', () => {
  given(
    '[case1] the caller RUNS lifecycle hooks and pnpm gates a build',
    () => {
      // .why `lifecycleHooks: 'run'` = it is the argument that makes the row reachable at
      //   all. with `'skip'` the install carries `--ignore-scripts`, pnpm has no hook to
      //   gate, and no ERR_PNPM_IGNORED_BUILDS can arise
      const asGatedExit = (): ReturnType<typeof spawnNpmInstall> => ({
        status: 1,
        signal: null,
        error: undefined,
        output:
          '[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts: node-pty@1.2.0-beta.15',
      });

      when('[t0] the gate notice stands ALONE on a nonzero exit', () => {
        then('it does NOT throw — the packages installed', async () => {
          // 🚨 `.resolves` is what asserts the absence of a throw, and it is spelled out
          //   rather than left to the `await`. `withCapturedStreams` does NOT catch — it
          //   returns `{ out, err, result }` and lets a throw reject — so an
          //   `expect(captured.error).toEqual(undefined)` compares undefined to undefined
          //   and passes on EVERY input, while the rejection does the real work
          //   unattributed. a green assertion that is not the one to redden is the shape
          //   `rule.forbid.failhide` warns of, and it was live in this row until the type
          //   checker rejected the field that never existed.
          //
          // .the mutation that reddens this = drop the `build-gate-blocked` early return
          //   and let it fall through to `asNpmInstallFailureError` like any nonzero exit.
          //   the throw then rejects, and `.resolves` fails the row by name
          await expect(
            withCapturedStreams({
              run: () =>
                execNpmInstallLocal(
                  { packages: ['rhachet'], lifecycleHooks: 'run' },
                  context,
                  {
                    detect: detectPnpm,
                    spawn: genSpawnThatAnswers(asGatedExit()).spawn,
                  },
                ),
            }),
          ).resolves.toEqual(expect.objectContaining({ result: undefined }));
        });

        // 🚨 THE SCREEN, not the return — and the two are separable, which is why this is a
        //   second row rather than one more assertion above. the row above proves the CALLER
        //   is told the truth; a human who watched pnpm print a red ERR block and then saw a
        //   bare success would still read a contradiction (`rule.require.status-feedback`)
        then(
          'the human READS why the ERR above was not a failure',
          async () => {
            const captured = await withCapturedStreams({
              run: () =>
                execNpmInstallLocal(
                  { packages: ['rhachet'], lifecycleHooks: 'run' },
                  context,
                  {
                    detect: detectPnpm,
                    spawn: genSpawnThatAnswers(asGatedExit()).spawn,
                  },
                ),
            });

            // .the mutation that reddens this = drop the `printNpmInstallGateNote()` call
            //   while the early return stays. the row above holds; only this one moves
            expect(captured.out).toContain('not a failure');
          },
        );
      });
    },
  );

  given('[case2] the caller SKIPS lifecycle hooks — the shipped path', () => {
    // 🚨 the complement, and it is what makes `[case1]` mean what it claims. this asserts
    //   the production argument really does spend `--ignore-scripts`, which is the reason
    //   the gate row is unreachable today. absent this, `[case1]` would document a branch
    //   whose deadness rests on a claim no test checks
    when('[t0] the install is built', () => {
      then(
        'it carries --ignore-scripts, so pnpm has no hook to gate',
        async () => {
          const fake = genSpawnThatAnswers({
            status: 0,
            signal: null,
            error: undefined,
            output: '',
          });

          await withCapturedStreams({
            run: () =>
              execNpmInstallLocal(
                { packages: ['rhachet'], lifecycleHooks: 'skip' },
                context,
                { detect: detectPnpm, spawn: fake.spawn },
              ),
          });

          expect(fake.getTaken().packageManager).toEqual('pnpm');
          expect(fake.getTaken().args).toContain('--ignore-scripts');
          // the cwd the caller's context named must reach the install, else the packages
          // land in whatever tree the process happened to start in
          expect(fake.getTaken().cwd).toEqual('/tmp/project');
        },
      );
    });
  });
});
