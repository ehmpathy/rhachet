import type { MalfunctionError } from 'helpful-errors';
import { given, then, useThen, when } from 'test-fns';

import { getOneLazyEsmModuleLoader } from './getOneLazyEsmModuleLoader';
import { getOneEsmLoadFailureHint } from './importEsmOrRequire';

/**
 * .what = unit clamp for the shared lazy pure-esm module loader (ehmpathy/rhachet#468)
 * .why  = both keyrack landmines (age-encryption, @octokit/auth-app) load through this ONE seam, so
 *         its three guarantees — lazy + memoized/single-flight + fail-loud-and-actionable — are
 *         proven here once for every caller. the fail-loud branch (vision edge e6) is the branch
 *         rule.forbid.eager-esm-imports-in-prod (.how-to-detect "prove the fail-loud path too")
 *         and peer lanes r8.b1 / r9.b1 demand be tested + snapped.
 * .note = the load boundary is INJECTED (a fake `load` fn), never `jest.mock`ed — the loader takes
 *         an optional `load` dependency for exactly this (rule.forbid.unit.remote-boundaries: inject
 *         a fake, never mock). the real-node prod load-path is proven separately by
 *         keyrackEsmRequire.realnode.acceptance.test.ts.
 */
describe('getOneLazyEsmModuleLoader', () => {
  given('[case1] the module loads clean', () => {
    when('[t0] the loader is called twice (memoize + single-flight)', () => {
      const scene = useThen(
        'one shared load, cached value returned',
        async () => {
          // a fake load that counts how many times it fired
          let loadCallCount = 0;
          const load = async (): Promise<{ hello: string }> => {
            loadCallCount += 1;
            return { hello: 'world' };
          };
          const loader = getOneLazyEsmModuleLoader<{ hello: string }>({
            specifier: 'demo-esm',
            purpose: 'a demo',
            load,
          });
          const [first, second] = await Promise.all([loader(), loader()]);
          return { first, second, loadCallCount };
        },
      );

      then('both calls return the loaded module', () => {
        expect(scene.first).toEqual({ hello: 'world' });
        expect(scene.second).toEqual({ hello: 'world' });
      });

      then('the load fired exactly once (single-flight)', () => {
        expect(scene.loadCallCount).toBe(1);
      });
    });
  });

  given(
    '[case2] the module is absent/broken (import rejects) — vision edge e6',
    () => {
      when('[t0] the loader is called', () => {
        then(
          'it fails loud with a MalfunctionError that names the module + purpose',
          async () => {
            const load = async (): Promise<never> => {
              throw new Error(
                'A dynamic import callback was invoked without --experimental-vm-modules',
              );
            };
            const loader = getOneLazyEsmModuleLoader({
              specifier: 'age-encryption',
              purpose: 'keyrack crypto',
              load,
            });
            await expect(loader()).rejects.toThrow(
              'failed to load the age-encryption module for keyrack crypto',
            );
          },
        );

        then(
          'the full caller-visible error output is pinned (message + hint + reason)',
          async () => {
            const load = async (): Promise<never> => {
              throw new Error('boom-from-loader');
            };
            const loader = getOneLazyEsmModuleLoader({
              specifier: 'age-encryption',
              purpose: 'keyrack crypto',
              load,
            });
            const error = (await loader().catch(
              (caught) => caught,
            )) as MalfunctionError;
            expect({
              message: error.message,
              hint: error.metadata?.hint,
              reason: error.metadata?.reason,
            }).toMatchSnapshot();
          },
        );
      });

      when('[t1] the loader is called again after a failed load', () => {
        then(
          'the failed load is NOT cached — a later call re-attempts',
          async () => {
            // a fake that rejects on the first call, resolves on the second
            let attempt = 0;
            const load = async (): Promise<{ recovered: boolean }> => {
              attempt += 1;
              if (attempt === 1) throw new Error('transient boom');
              return { recovered: true };
            };
            const loader = getOneLazyEsmModuleLoader<{ recovered: boolean }>({
              specifier: 'demo-esm',
              purpose: 'a demo',
              load,
            });
            await expect(loader()).rejects.toThrow(
              'failed to load the demo-esm module',
            );
            // the second call must re-attempt (not replay the cached rejection) and succeed
            await expect(loader()).resolves.toEqual({ recovered: true });
            expect(attempt).toBe(2);
          },
        );
      });
    },
  );

  given(
    '[case3] the failure hint is runtime-aware (r9.nitpick.1 companion)',
    () => {
      when('[t0] the loader fails for @octokit/auth-app under jest', () => {
        then(
          'the hint matches getOneEsmLoadFailureHint for that specifier',
          async () => {
            const load = async (): Promise<never> => {
              throw new Error('boom');
            };
            const loader = getOneLazyEsmModuleLoader({
              specifier: '@octokit/auth-app',
              purpose: 'github app auth',
              load,
            });
            const error = (await loader().catch(
              (caught) => caught,
            )) as MalfunctionError;
            expect(error.metadata?.hint).toEqual(
              getOneEsmLoadFailureHint({ specifier: '@octokit/auth-app' }),
            );
          },
        );
      });
    },
  );

  given(
    '[case4] the failure hint keys off the runtime, not a fixed transform',
    () => {
      // the runtime is INJECTED per case (`{ runtime }`), never via a mutation of the shared
      // process.env.JEST_WORKER_ID — a mutation of that flag races every other suite in the same
      // jest worker (real code branches on it). injection pins each variant deterministically and
      // side-effect-free.
      when('[t0] the runtime is jest', () => {
        then('the hint names the consumer jest transform path', () => {
          const hint = getOneEsmLoadFailureHint(
            { specifier: 'age-encryption' },
            { runtime: 'jest' },
          );
          expect(hint).toContain('under jest');
          expect(hint).toContain('your jest transform');

          // pin the caller-visible jest-runtime hint
          expect(hint).toMatchSnapshot();
        });
      });

      when('[t1] the runtime is real node (a downstream consumer)', () => {
        then('the hint names the esm-load fix, never a jest transform', () => {
          const hint = getOneEsmLoadFailureHint(
            { specifier: 'age-encryption' },
            { runtime: 'node' },
          );
          expect(hint).toContain('loads as esm in this node runtime');
          expect(hint).not.toContain('jest');

          // pin the caller-visible real-node hint — the one a downstream prod consumer actually
          // sees for a broken pure-esm install (r2 nitpick: this variant deserves a pinned snapshot)
          expect(hint).toMatchSnapshot();
        });
      });

      when('[t2] no runtime is injected (the real env read)', () => {
        then('it defaults to the jest hint under the jest worker', () => {
          // no env mutation: the suite runs under jest, so JEST_WORKER_ID is set and the default
          // read yields the jest hint — proves the default branch without a touch of process.env.
          const hint = getOneEsmLoadFailureHint({
            specifier: 'age-encryption',
          });
          expect(hint).toContain('under jest');
        });
      });
    },
  );
});
