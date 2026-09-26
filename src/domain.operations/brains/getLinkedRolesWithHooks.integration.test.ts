import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { ContextCli } from '@src/domain.objects/ContextCli';
import { importPackageExports } from '@src/infra/importEsmSafe/importPackageExports';

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * .mock = the npm package load leaf (`importPackageExports`)
 * .why = each case below needs a `rhachet-roles-<slug>` package whose load either fails
 *        outright, yields a malformed registry, or yields a well-formed one. a real one
 *        would need a published (or pnpm-installed) fixture package PER case, inside each
 *        temp repo's own node_modules — a package install per case, which the test-speed
 *        mandate and `rule.forbid.npm-in-tests` both argue against.
 * .real = the leaf's own real-load behavior is covered by its own tests, beside it at
 *         `src/infra/importEsmSafe/`; and the real end-to-end load runs in
 *         `src/contract/cli/invokeInit.integration.test.ts`, which installs role packages.
 * .note = the FILESYSTEM is NOT mocked here. every case writes a real `.agent/` tree into
 *         a real temp dir, so the directory walk under test — the `repo=` scan, the
 *         `repo=.this` skip, the `role=` filter — runs against real dirents.
 */
jest.mock('@src/infra/importEsmSafe/importPackageExports');

import { getLinkedRolesWithHooks } from './getLinkedRolesWithHooks';

const mockImportPackageExports = importPackageExports as jest.Mock;

/**
 * .what = a real repo dir that holds a real `.agent/` tree of linked repos and roles
 * .why = the walk under test reads real dirents, so the tree it walks is real too
 */
const genRepoWithLinkedRoles = (input: {
  slug: string;
  linked: Record<string, string[]> | null;
}): string => {
  const gitroot = genTempDir({ slug: input.slug });
  writeFileSync(join(gitroot, 'package.json'), '{ "name": "test-repo" }');

  // a null `linked` writes NO .agent/ at all, so the absent-dir branch is real
  if (input.linked === null) return gitroot;

  for (const [repoSlug, roleSlugs] of Object.entries(input.linked)) {
    // a repo with no roles still gets its own dir, so the scan sees it
    mkdirSync(join(gitroot, '.agent', `repo=${repoSlug}`), { recursive: true });
    for (const roleSlug of roleSlugs)
      mkdirSync(
        join(gitroot, '.agent', `repo=${repoSlug}`, `role=${roleSlug}`),
        { recursive: true },
      );
  }

  return gitroot;
};

/**
 * .what = a well-formed registry that holds one role with an onBrain hook
 * .why = the healthy peer in each isolation case, so its survival is provable
 */
const asHealthyRegistryModule = (input: { slug: string; role: string }) => ({
  ok: true,
  module: {
    getRoleRegistry: () => ({
      slug: input.slug,
      roles: [{ slug: input.role, hooks: { onBrain: () => undefined } }],
    }),
  },
});

describe('getLinkedRolesWithHooks (integration)', () => {
  beforeEach(() => {
    mockImportPackageExports.mockReset();
  });

  given('[case1] no .agent/ directory', () => {
    when('[t0] .agent does not exist on disk', () => {
      const scene = useBeforeAll(async () => {
        const gitroot = genRepoWithLinkedRoles({
          slug: 'getLinkedRoles-noagent',
          linked: null,
        });
        const context = new ContextCli({ cwd: gitroot, gitroot });
        return getLinkedRolesWithHooks(context);
      });

      then('the roles array is empty', () => {
        expect(scene.roles).toEqual([]);
      });

      then('the errors array is empty', () => {
        expect(scene.errors).toEqual([]);
      });

      then('the package load is never reached', () => {
        expect(mockImportPackageExports).not.toHaveBeenCalled();
      });
    });
  });

  given('[case2] only repo=.this exists', () => {
    when('[t0] .agent holds only repo=.this on disk', () => {
      const scene = useBeforeAll(async () => {
        const gitroot = genRepoWithLinkedRoles({
          slug: 'getLinkedRoles-onlythis',
          linked: { '.this': ['any'] },
        });
        const context = new ContextCli({ cwd: gitroot, gitroot });
        return getLinkedRolesWithHooks(context);
      });

      then('the roles array is empty', () => {
        expect(scene.roles).toEqual([]);
      });

      then('the errors array is empty', () => {
        expect(scene.errors).toEqual([]);
      });

      then('repo=.this is skipped, so no package load is attempted', () => {
        expect(mockImportPackageExports).not.toHaveBeenCalled();
      });
    });
  });

  given('[case3] linked role from package that cannot be loaded', () => {
    when('[t0] the package load yields a { ok: false } union', () => {
      const scene = useBeforeAll(async () => {
        // the shared load leaf isolates the load failure as data (not a throw)
        mockImportPackageExports.mockResolvedValue({
          ok: false,
          error: new Error(`Cannot find module 'rhachet-roles-nonexistent'`),
        });
        const gitroot = genRepoWithLinkedRoles({
          slug: 'getLinkedRoles-unloadable',
          linked: { '.this': ['any'], nonexistent: ['mechanic', 'designer'] },
        });
        const context = new ContextCli({ cwd: gitroot, gitroot });
        return getLinkedRolesWithHooks(context);
      });

      then('the roles array is empty', () => {
        expect(scene.roles).toEqual([]);
      });

      then('an error is recorded for EACH linked role of that repo', () => {
        // a real readdir gives no order guarantee, so the set is asserted exactly
        expect(
          scene.errors
            .map((fault) => `${fault.repoSlug}/${fault.roleSlug}`)
            .sort(),
        ).toEqual(['nonexistent/designer', 'nonexistent/mechanic']);
      });

      then('each error message names the package that could not load', () => {
        expect(scene.errors.map((fault) => fault.error.message)).toEqual([
          `Cannot find module 'rhachet-roles-nonexistent'`,
          `Cannot find module 'rhachet-roles-nonexistent'`,
        ]);
      });

      then('each error is tagged as a LOAD-phase fault', () => {
        expect(scene.errors.map((fault) => fault.phase)).toEqual([
          'load',
          'load',
        ]);
      });
    });
  });

  given('[case4] one bad repo beside one healthy repo', () => {
    when('[t0] the bad repo load fails but the healthy repo loads', () => {
      // .why = acc#3 — a single bad role package must never sink the registry. this
      //        exercises the multi-item loop directly: repo=badpkg fails to load, and
      //        repo=goodpkg must still load its role.
      const scene = useBeforeAll(async () => {
        mockImportPackageExports.mockImplementation(
          async ({ packageName }: { packageName: string }) => {
            if (packageName === 'rhachet-roles-badpkg')
              return {
                ok: false,
                error: new Error(
                  'Cannot use import statement outside a module',
                ),
              };
            return asHealthyRegistryModule({
              slug: 'goodpkg',
              role: 'surfer',
            });
          },
        );
        const gitroot = genRepoWithLinkedRoles({
          slug: 'getLinkedRoles-badbesidegood',
          linked: { badpkg: ['mechanic'], goodpkg: ['surfer'] },
        });
        const context = new ContextCli({ cwd: gitroot, gitroot });
        return getLinkedRolesWithHooks(context);
      });

      then('the healthy repo role still loads', () => {
        expect(scene.roles).toHaveLength(1);
        expect(scene.roles[0]?.slug).toEqual('surfer');
        expect(scene.roles[0]?.repo).toEqual('goodpkg');
      });

      then('the bad repo failure is isolated to its own error', () => {
        expect(
          scene.errors.map((fault) => `${fault.repoSlug}/${fault.roleSlug}`),
        ).toEqual(['badpkg/mechanic']);
      });
    });
  });

  given('[case5] a repo that loads but yields a malformed registry', () => {
    when('[t0] the registry loads but its `.roles` is absent', () => {
      // .why = acc#3, USE phase — a package can LOAD fine (leaf yields { ok: true }) yet
      //        yield a registry that throws when read (e.g. `.roles` absent, from a
      //        stale/incompatible version). that throw is in the registry-read phase, which
      //        the caller isolates separately from the load; it must not sink the healthy
      //        peer. proves the use-phase guard, distinct from the load leaf.
      const scene = useBeforeAll(async () => {
        mockImportPackageExports.mockImplementation(
          async ({ packageName }: { packageName: string }) => {
            if (packageName === 'rhachet-roles-malformed')
              return {
                ok: true,
                module: { getRoleRegistry: () => ({ slug: 'malformed' }) },
              };
            return asHealthyRegistryModule({
              slug: 'goodpkg',
              role: 'surfer',
            });
          },
        );
        const gitroot = genRepoWithLinkedRoles({
          slug: 'getLinkedRoles-malformed',
          linked: { malformed: ['mechanic'], goodpkg: ['surfer'] },
        });
        const context = new ContextCli({ cwd: gitroot, gitroot });
        return getLinkedRolesWithHooks(context);
      });

      then('the healthy repo role still loads', () => {
        expect(scene.roles).toHaveLength(1);
        expect(scene.roles[0]?.slug).toEqual('surfer');
        expect(scene.roles[0]?.repo).toEqual('goodpkg');
      });

      then(
        'the malformed-registry failure is isolated to its own error',
        () => {
          expect(
            scene.errors.map((fault) => `${fault.repoSlug}/${fault.roleSlug}`),
          ).toEqual(['malformed/mechanic']);
        },
      );

      then('the error is tagged as a USE-phase fault (not load)', () => {
        expect(scene.errors.map((fault) => fault.phase)).toEqual(['use']);
      });
    });
  });

  given('[case6] linked roles that declare role boot hooks', () => {
    when('[t0] one role holds a role boot hook and the adhoc hook', () => {
      // .why = D3 — the brain dir boot.md supersedes each role boot hook, so discovery drops
      //        it; the adhoc route.drive onBoot hook and every other event's hooks survive
      const routeDriveHook = {
        command:
          './node_modules/.bin/rhachet run --repo bhrain --skill route.drive --when hook.onBoot',
        timeout: 'PT30S',
      };
      const stopHook = { command: 'echo stop', timeout: 'PT5S' };
      const scene = useBeforeAll(async () => {
        mockImportPackageExports.mockResolvedValue({
          ok: true,
          module: {
            getRoleRegistry: () => ({
              slug: 'bhrain',
              roles: [
                {
                  slug: 'driver',
                  hooks: {
                    onBrain: {
                      onBoot: [
                        {
                          command:
                            './node_modules/.bin/rhachet roles boot --repo bhrain --role driver',
                          timeout: 'PT60S',
                        },
                        routeDriveHook,
                      ],
                      onStop: [stopHook],
                    },
                  },
                },
                {
                  slug: 'learner',
                  hooks: {
                    onBrain: {
                      onBoot: [
                        {
                          command:
                            'npx rhachet roles boot --repo bhrain --role learner',
                          timeout: 'PT60S',
                        },
                      ],
                    },
                  },
                },
              ],
            }),
          },
        });
        const gitroot = genRepoWithLinkedRoles({
          slug: 'getLinkedRoles-boothooks',
          linked: { bhrain: ['driver', 'learner'] },
        });
        const context = new ContextCli({ cwd: gitroot, gitroot });
        return getLinkedRolesWithHooks(context);
      });

      then('the adhoc route.drive hook is kept', () => {
        const driver = scene.roles.find((role) => role.slug === 'driver');
        expect(driver?.hooks?.onBrain?.onBoot).toEqual([routeDriveHook]);
      });

      then('the hooks of other events are kept', () => {
        const driver = scene.roles.find((role) => role.slug === 'driver');
        expect(driver?.hooks?.onBrain?.onStop).toEqual([stopHook]);
      });

      then('a role with only a role boot hook holds no onBoot hooks', () => {
        const learner = scene.roles.find((role) => role.slug === 'learner');
        expect(learner?.hooks?.onBrain?.onBoot).toEqual([]);
      });

      then(
        'both roles stay listed, so the reconcile removes their extant role boot hooks',
        () => {
          // a real readdir gives no order guarantee, so the set is asserted exactly
          expect(scene.roles.map((role) => role.slug).sort()).toEqual([
            'driver',
            'learner',
          ]);
        },
      );
    });
  });
});
