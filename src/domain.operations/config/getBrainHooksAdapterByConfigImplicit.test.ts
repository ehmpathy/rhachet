import { ConstraintError } from 'helpful-errors';
import { getError, given, then, useBeforeAll, when } from 'test-fns';

import { ContextCli } from '@src/domain.objects/ContextCli';
import * as discoverModule from '@src/domain.operations/brains/discoverBrainPackages';
import { importPackageExports } from '@src/infra/importEsmSafe/importPackageExports';

import { getBrainHooksAdapterByConfigImplicit } from './getBrainHooksAdapterByConfigImplicit';

// mock the discoverBrainPackages module + the shared load leaf
jest.mock('../brains/discoverBrainPackages');
jest.mock('@src/infra/importEsmSafe/importPackageExports');

const mockImportPackageExports = importPackageExports as jest.Mock;

describe('getBrainHooksAdapterByConfigImplicit', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  given('[case1] no brain packages found', () => {
    when('[t0] discoverBrainPackages returns empty', () => {
      const scene = useBeforeAll(async () => {
        jest
          .spyOn(discoverModule, 'discoverBrainPackages')
          .mockResolvedValue([]);
        const context = new ContextCli({ cwd: '/test', gitroot: '/test' });
        const result = await getBrainHooksAdapterByConfigImplicit(
          { brain: 'claude-code' },
          context,
        );
        return { result };
      });

      then('returns null', () => {
        expect(scene.result).toBeNull();
      });
    });
  });

  given('[case2] package load fails gracefully', () => {
    when('[t0] the package load returns a { ok: false } union', () => {
      const scene = useBeforeAll(async () => {
        jest
          .spyOn(discoverModule, 'discoverBrainPackages')
          .mockResolvedValue(['rhachet-brains-nonexistent']);

        // the shared load leaf isolates the load failure as data (not a throw)
        mockImportPackageExports.mockResolvedValue({
          ok: false,
          error: new Error(`Cannot find module 'rhachet-brains-nonexistent'`),
        });

        // capture stderr calls directly (survives mock reset)
        const stderrCalls: string[] = [];
        jest.spyOn(console, 'error').mockImplementation((msg: string) => {
          stderrCalls.push(msg);
        });

        const context = new ContextCli({
          cwd: '/nonexistent/repo',
          gitroot: '/nonexistent/repo',
        });
        const result = await getBrainHooksAdapterByConfigImplicit(
          { brain: 'claude-code' },
          context,
        );
        return { result, stderrCalls };
      });

      then('returns null (continues after load failure)', () => {
        expect(scene.result).toBeNull();
      });

      then('emits load failure to stderr', () => {
        expect(scene.stderrCalls.length).toBeGreaterThan(0);
        expect(scene.stderrCalls[0]).toContain('brain package load failed');
        expect(scene.stderrCalls[0]).toContain('rhachet-brains-nonexistent');
      });
    });
  });

  given('[case3] one bad package beside one healthy package', () => {
    when(
      '[t0] the bad package load fails but the healthy package loads',
      () => {
        // .why = acc#3 — a single bad brain package must never sink the registry. this
        //        exercises the multi-item loop directly: rhachet-brains-badpkg fails to load,
        //        and rhachet-brains-goodpkg must still yield its adapter. proves loop-survival
        //        jest-side (a { ok: false } from the mocked load leaf), no real import() needed.
        const scene = useBeforeAll(async () => {
          jest
            .spyOn(discoverModule, 'discoverBrainPackages')
            .mockResolvedValue([
              'rhachet-brains-badpkg',
              'rhachet-brains-goodpkg',
            ]);

          // badpkg fails to load; goodpkg loads a getBrainHooks that matches the brain
          mockImportPackageExports.mockImplementation(
            async ({ packageName }: { packageName: string }) => {
              if (packageName === 'rhachet-brains-badpkg')
                return {
                  ok: false,
                  error: new Error(
                    'Cannot use import statement outside a module',
                  ),
                };
              return {
                ok: true,
                module: {
                  getBrainHooks: ({ brain }: { brain: string }) =>
                    brain === 'claude-code' ? { slug: 'goodpkg' } : null,
                },
              };
            },
          );

          const stderrCalls: string[] = [];
          jest.spyOn(console, 'error').mockImplementation((msg: string) => {
            stderrCalls.push(msg);
          });

          const context = new ContextCli({ cwd: '/test', gitroot: '/test' });
          const result = await getBrainHooksAdapterByConfigImplicit(
            { brain: 'claude-code' },
            context,
          );
          return { result, stderrCalls };
        });

        then('the healthy package adapter still loads', () => {
          expect(scene.result).not.toBeNull();
          expect(scene.result?.slug).toEqual('goodpkg');
        });

        then('the bad package failure is isolated to stderr', () => {
          expect(scene.stderrCalls.length).toBeGreaterThan(0);
          expect(scene.stderrCalls[0]).toContain('brain package load failed');
          expect(scene.stderrCalls[0]).toContain('rhachet-brains-badpkg');
        });
      },
    );
  });

  given('[case4] a package loads fine but its getBrainHooks throws', () => {
    when('[t0] the use-phase getBrainHooks call throws post-load', () => {
      // .why = phase-accuracy — a use-phase throw (package loaded ok, getBrainHooks itself
      //        threw) must NOT be reported as a "load failed" fault, which would point the
      //        operator at the wrong layer. proves the message is tagged by phase, not blanket.
      const scene = useBeforeAll(async () => {
        jest
          .spyOn(discoverModule, 'discoverBrainPackages')
          .mockResolvedValue(['rhachet-brains-throwspkg']);

        // the package LOADS fine (ok: true), but its getBrainHooks throws when called
        mockImportPackageExports.mockResolvedValue({
          ok: true,
          module: {
            getBrainHooks: () => {
              throw new Error('boom in getBrainHooks');
            },
          },
        });

        const stderrCalls: string[] = [];
        jest.spyOn(console, 'error').mockImplementation((msg: string) => {
          stderrCalls.push(msg);
        });

        const context = new ContextCli({ cwd: '/test', gitroot: '/test' });
        const result = await getBrainHooksAdapterByConfigImplicit(
          { brain: 'claude-code' },
          context,
        );
        return { result, stderrCalls };
      });

      then('returns null (use-phase fault isolated, registry survives)', () => {
        expect(scene.result).toBeNull();
      });

      then('the message names the use phase, NOT "load failed"', () => {
        expect(scene.stderrCalls.length).toBeGreaterThan(0);
        expect(scene.stderrCalls[0]).toContain('brain hooks lookup failed');
        expect(scene.stderrCalls[0]).toContain('rhachet-brains-throwspkg');
        expect(scene.stderrCalls[0]).toContain('boom in getBrainHooks');
      });

      then('the message does NOT mislabel it as a package load failure', () => {
        expect(scene.stderrCalls[0]).not.toContain('brain package load failed');
      });
    });
  });

  given('[case5] two packages both match the same brain (ambiguous)', () => {
    when('[t0] two loaded packages each return a non-null adapter', () => {
      // .why = an ambiguous config the caller must fix — 2+ installed packages both claim the
      //        same brain specifier. it must fail loud with a ConstraintError that holds
      //        { brain, adaptersMatched } (rule.require.failloud), never a silent pick of one.
      //        this drives the adaptersMatched.length > 1 branch, previously untested.
      const scene = useBeforeAll(async () => {
        jest
          .spyOn(discoverModule, 'discoverBrainPackages')
          .mockResolvedValue(['rhachet-brains-one', 'rhachet-brains-two']);

        // both packages load fine and both claim the requested brain → ambiguous
        mockImportPackageExports.mockImplementation(
          async ({ packageName }: { packageName: string }) => ({
            ok: true,
            module: {
              getBrainHooks: () => ({
                slug: packageName.replace('rhachet-brains-', ''),
              }),
            },
          }),
        );

        const context = new ContextCli({ cwd: '/test', gitroot: '/test' });
        const error = await getError(
          getBrainHooksAdapterByConfigImplicit(
            { brain: 'claude-code' },
            context,
          ),
        );
        return { error };
      });

      then(
        'it throws a ConstraintError (caller must fix the ambiguous config)',
        () => {
          expect(scene.error).toBeInstanceOf(ConstraintError);
        },
      );

      then('the error names both matched adapters', () => {
        expect(scene.error?.message).toContain('one');
        expect(scene.error?.message).toContain('two');
      });
    });
  });

  // note: actual adapter lookup is tested via acceptance tests
  // see: blackbox/cli/init.hooks.acceptance.test.ts
  // see: blackbox/sdk/getBrainHooksAdapterByConfigImplicit.realnode.acceptance.test.ts (case1, esm-only fixture)
});
