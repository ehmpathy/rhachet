import * as fs from 'fs';
import { given, then, useBeforeAll, when } from 'test-fns';

import { ContextCli } from '@src/domain.objects/ContextCli';
import { importPackageExports } from '@src/infra/importEsmSafe/importPackageExports';

// mock modules before function import
jest.mock('fs');
jest.mock('@src/infra/importEsmSafe/importPackageExports');

import { getLinkedRolesWithHooks } from './getLinkedRolesWithHooks';

const mockExistsSync = fs.existsSync as jest.Mock;
const mockReaddirSync = fs.readdirSync as jest.Mock;
const mockImportPackageExports = importPackageExports as jest.Mock;

describe('getLinkedRolesWithHooks', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  given('[case1] no .agent/ directory', () => {
    when('[t0] .agent does not exist', () => {
      const scene = useBeforeAll(async () => {
        mockExistsSync.mockReturnValue(false);
        const context = new ContextCli({
          cwd: '/test-repo',
          gitroot: '/test-repo',
        });
        return getLinkedRolesWithHooks(context);
      });

      then('returns empty roles array', () => {
        expect(scene.roles).toHaveLength(0);
      });

      then('returns empty errors array', () => {
        expect(scene.errors).toHaveLength(0);
      });
    });
  });

  given('[case2] only repo=.this exists', () => {
    when('[t0] .agent has only repo=.this', () => {
      const scene = useBeforeAll(async () => {
        mockExistsSync.mockReturnValue(true);
        mockReaddirSync.mockReturnValue(['repo=.this']);
        const context = new ContextCli({
          cwd: '/test-repo',
          gitroot: '/test-repo',
        });
        return getLinkedRolesWithHooks(context);
      });

      then('returns empty roles array', () => {
        expect(scene.roles).toHaveLength(0);
      });

      then('returns empty errors array', () => {
        expect(scene.errors).toHaveLength(0);
      });
    });
  });

  given('[case3] linked role from package that cannot be loaded', () => {
    when('[t0] the package load returns a { ok: false } union', () => {
      const scene = useBeforeAll(async () => {
        mockExistsSync.mockReturnValue(true);
        mockReaddirSync
          .mockReturnValueOnce(['repo=.this', 'repo=nonexistent']) // .agent/
          .mockReturnValueOnce(['role=mechanic', 'role=designer']); // .agent/repo=nonexistent/

        // the shared load leaf isolates the load failure as data (not a throw)
        mockImportPackageExports.mockResolvedValue({
          ok: false,
          error: new Error(`Cannot find module 'rhachet-roles-nonexistent'`),
        });

        const context = new ContextCli({
          cwd: '/test-repo',
          gitroot: '/test-repo',
        });
        return getLinkedRolesWithHooks(context);
      });

      then('returns empty roles array', () => {
        expect(scene.roles).toHaveLength(0);
      });

      then('returns errors for each linked role', () => {
        expect(scene.errors).toHaveLength(2);
        expect(scene.errors[0]?.repoSlug).toEqual('nonexistent');
        expect(scene.errors[0]?.roleSlug).toEqual('mechanic');
        expect(scene.errors[1]?.roleSlug).toEqual('designer');
      });

      then('error message indicates package resolution failed', () => {
        expect(scene.errors[0]?.error.message).toContain(
          'rhachet-roles-nonexistent',
        );
      });

      then('each error is tagged as a LOAD-phase fault', () => {
        expect(scene.errors[0]?.phase).toEqual('load');
        expect(scene.errors[1]?.phase).toEqual('load');
      });
    });
  });

  given('[case4] one bad repo beside one healthy repo', () => {
    when('[t0] the bad repo load fails but the healthy repo loads', () => {
      // .why = acc#3 — a single bad role package must never sink the registry. this
      //        exercises the multi-item loop directly: repo=badpkg fails to load, and
      //        repo=goodpkg must still load its role. proves loop-survival jest-side (a
      //        { ok: false } from the mocked load leaf), no real import() needed.
      const scene = useBeforeAll(async () => {
        mockExistsSync.mockReturnValue(true);
        mockReaddirSync
          .mockReturnValueOnce(['repo=badpkg', 'repo=goodpkg']) // .agent/
          .mockReturnValueOnce(['role=mechanic']) // .agent/repo=badpkg/
          .mockReturnValueOnce(['role=surfer']); // .agent/repo=goodpkg/

        // badpkg fails to load (esm-only downlevel); goodpkg loads a registry that holds
        // the linked role with hooks.onBrain
        mockImportPackageExports.mockImplementation(
          async ({ packageName }: { packageName: string }) => {
            if (packageName === 'rhachet-roles-badpkg')
              return {
                ok: false,
                error: new Error(
                  'Cannot use import statement outside a module',
                ),
              };
            return {
              ok: true,
              module: {
                getRoleRegistry: () => ({
                  slug: 'goodpkg',
                  roles: [
                    { slug: 'surfer', hooks: { onBrain: () => undefined } },
                  ],
                }),
              },
            };
          },
        );

        const context = new ContextCli({
          cwd: '/test-repo',
          gitroot: '/test-repo',
        });
        return getLinkedRolesWithHooks(context);
      });

      then('the healthy repo role still loads', () => {
        expect(scene.roles).toHaveLength(1);
        expect(scene.roles[0]?.slug).toEqual('surfer');
        expect(scene.roles[0]?.repo).toEqual('goodpkg');
      });

      then('the bad repo failure is isolated to its own error', () => {
        expect(scene.errors).toHaveLength(1);
        expect(scene.errors[0]?.repoSlug).toEqual('badpkg');
        expect(scene.errors[0]?.roleSlug).toEqual('mechanic');
      });
    });
  });

  given('[case5] a repo that loads but returns a malformed registry', () => {
    when('[t0] the registry loads but its `.roles` is absent', () => {
      // .why = acc#3, USE phase — a package can LOAD fine (leaf returns { ok: true }) yet
      //        return a registry that throws when read (e.g. `.roles` absent, from a
      //        stale/incompatible version). that throw is in the registry-read phase, which
      //        the caller isolates separately from the load; it must not sink the healthy
      //        peer. proves the use-phase guard, distinct from the load leaf.
      const scene = useBeforeAll(async () => {
        mockExistsSync.mockReturnValue(true);
        mockReaddirSync
          .mockReturnValueOnce(['repo=malformed', 'repo=goodpkg']) // .agent/
          .mockReturnValueOnce(['role=mechanic']) // .agent/repo=malformed/
          .mockReturnValueOnce(['role=surfer']); // .agent/repo=goodpkg/

        // malformed loads fine ({ ok: true }) but its registry has NO `.roles` — a read of
        // it throws a TypeError; goodpkg loads a well-formed registry with the linked role
        mockImportPackageExports.mockImplementation(
          async ({ packageName }: { packageName: string }) => {
            if (packageName === 'rhachet-roles-malformed')
              return {
                ok: true,
                module: { getRoleRegistry: () => ({ slug: 'malformed' }) },
              };
            return {
              ok: true,
              module: {
                getRoleRegistry: () => ({
                  slug: 'goodpkg',
                  roles: [
                    { slug: 'surfer', hooks: { onBrain: () => undefined } },
                  ],
                }),
              },
            };
          },
        );

        const context = new ContextCli({
          cwd: '/test-repo',
          gitroot: '/test-repo',
        });
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
          expect(scene.errors).toHaveLength(1);
          expect(scene.errors[0]?.repoSlug).toEqual('malformed');
          expect(scene.errors[0]?.roleSlug).toEqual('mechanic');
        },
      );

      then('the error is tagged as a USE-phase fault (not load)', () => {
        expect(scene.errors[0]?.phase).toEqual('use');
      });
    });
  });
});
