import { ConstraintError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { withCapturedStreams } from '@src/.test/assets/withCapturedStreams';
import { ContextCli } from '@src/domain.objects/ContextCli';

import { execUpgrade } from './execUpgrade';

// mock dependencies
jest.mock('./expandRoleSupplierSlugs', () => ({
  expandRoleSupplierSlugs: jest.fn(),
}));
jest.mock('./resolveBrainsToPackages', () => ({
  resolveBrainsToPackages: jest.fn(),
}));
jest.mock('./execNpmInstallLocal', () => ({
  execNpmInstallLocal: jest.fn(),
}));
// .note = the error CLASS is kept real while the function is mocked. a hand-rolled
//   stand-in for the class would let this suite pass against a shape the producer
//   cannot emit — the exact trap the prior EACCES string fell into
jest.mock('./execNpmInstallGlobal', () => ({
  ...jest.requireActual('./execNpmInstallGlobal'),
  execNpmInstallGlobal: jest.fn(),
}));
jest.mock('./getLocalRefDependencies', () => ({
  getLocalRefDependencies: jest.fn(),
}));
jest.mock('./getGlobalRhachetVersion', () => ({
  getGlobalRhachetVersion: jest.fn(),
}));
jest.mock('./detectInvocationMethod', () => ({
  detectInvocationMethod: jest.fn(),
}));
jest.mock(
  '@src/domain.operations/init/roles/link/initRolesFromPackages',
  () => ({
    initRolesFromPackages: jest.fn(),
  }),
);

import { initRolesFromPackages } from '@src/domain.operations/init/roles/link/initRolesFromPackages';

import { asNpmInstallFailureError } from './asNpmInstallFailureError';
import {
  NPM_INSTALL_FAILURE_KINDS,
  type NpmInstallFailureKind,
} from './asNpmInstallFailureKind';
import { detectInvocationMethod } from './detectInvocationMethod';
import { execNpmInstallGlobal } from './execNpmInstallGlobal';
import { execNpmInstallLocal } from './execNpmInstallLocal';
import { expandRoleSupplierSlugs } from './expandRoleSupplierSlugs';
import { getGlobalRhachetVersion } from './getGlobalRhachetVersion';
import { getLocalRefDependencies } from './getLocalRefDependencies';
import { resolveBrainsToPackages } from './resolveBrainsToPackages';

/**
 * .what = takes the callout block around a header line out of a captured console log —
 *   the blank above the header, the header, its indented message, and the blank below
 *
 * .why = BOUNDED to the four lines the branch composes. an unbounded tail would drag every
 *   later log line into the snapshot, so an unrelated change elsewhere in `execUpgrade`
 *   would redden a clamp about the hint — and a snapshot that goes red for reasons outside
 *   its own subject trains a reader to resnap without a look, which is how a clamp quietly
 *   becomes a decoration.
 *
 * .note = named rather than sliced inline, so the window's SHAPE is stated instead of
 *   encoded as a `-1`/`+3` a reader must simulate (`rule.require.named-transformers`)
 */
const asCalloutBlockFromLogs = (input: {
  logs: string[];
  headerHolds: string;
}): string[] => {
  const indexHeader = input.logs.findIndex((line) =>
    line.includes(input.headerHolds),
  );
  if (indexHeader < 0)
    throw new ConstraintError(
      'no log line holds the header this block is cut around',
      {
        hint: 'the header may have been reworded — read the branch in execUpgrade and follow it here — or that branch never ran, in which case the case set up the wrong mock',
        headerHolds: input.headerHolds,
        logs: input.logs,
      },
    );

  return input.logs.slice(indexHeader - 1, indexHeader + 3);
};

const mockExpandRoleSupplierSlugs =
  expandRoleSupplierSlugs as jest.MockedFunction<
    typeof expandRoleSupplierSlugs
  >;
const mockResolveBrainsToPackages =
  resolveBrainsToPackages as jest.MockedFunction<
    typeof resolveBrainsToPackages
  >;
const mockExecNpmInstallLocal = execNpmInstallLocal as jest.MockedFunction<
  typeof execNpmInstallLocal
>;
const mockExecNpmInstallGlobal = execNpmInstallGlobal as jest.MockedFunction<
  typeof execNpmInstallGlobal
>;
const mockGetLocalRefDependencies =
  getLocalRefDependencies as jest.MockedFunction<
    typeof getLocalRefDependencies
  >;
const mockGetGlobalRhachetVersion =
  getGlobalRhachetVersion as jest.MockedFunction<
    typeof getGlobalRhachetVersion
  >;
const mockDetectInvocationMethod =
  detectInvocationMethod as jest.MockedFunction<typeof detectInvocationMethod>;
const mockInitRolesFromPackages = initRolesFromPackages as jest.MockedFunction<
  typeof initRolesFromPackages
>;

describe('execUpgrade', () => {
  const context = new ContextCli({ cwd: '/test', gitroot: '/test' });

  /**
   * .what = runs one upgrade with the console redirected, and hands back both the lines it
   *   printed and what it returned
   *
   * .why  = 🚨 a REAL stream redirect, never a `jest.spyOn(console, 'log')`. a spy REPLACES
   *   the global logger with a stand-in, so every row that used one was checked against the
   *   stand-in's own record rather than against bytes a console produced — and a render that
   *   reached `process.stdout` by any other path (a `console.error`, a direct write) was
   *   invisible to it (`rule.forbid.unit.remote-boundaries`).
   *
   *   `withCapturedStreams` swaps in a real node `Console` whose two streams are in-memory
   *   sinks, so the code under test runs for real and only its output is diverted.
   *
   * .note = the split is on newlines rather than per call, so a single `console.log` that
   *   carries an embedded newline reads here as the two lines a human actually sees — which
   *   is the question every `logs.find(...)` below puts.
   */
  const runUpgradeCaptured = async (
    args: Parameters<typeof execUpgrade>[0],
  ): Promise<{
    logs: string[];
    result: Awaited<ReturnType<typeof execUpgrade>>;
  }> => {
    const captured = await withCapturedStreams({
      run: () => execUpgrade(args, context),
    });
    return { logs: captured.out.split('\n'), result: captured.result };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockExpandRoleSupplierSlugs.mockResolvedValue({
      packages: ['rhachet-roles-ehmpathy'],
      linkedRoles: [{ repo: 'ehmpathy', role: 'mechanic' }],
      slugs: ['ehmpathy/*'] as any,
    });
    mockResolveBrainsToPackages.mockResolvedValue(['rhachet-brains-anthropic']);
    mockGetLocalRefDependencies.mockReturnValue(new Set());
    mockInitRolesFromPackages.mockResolvedValue({
      rolesLinked: [],
      rolesInitialized: [],
      errors: [],
    });
    // default: global rhachet installed, invoked via global (not npx)
    mockGetGlobalRhachetVersion.mockReturnValue('1.39.10');
    mockDetectInvocationMethod.mockReturnValue('global');
    mockExecNpmInstallGlobal.mockReturnValue({ upgraded: true });
  });

  given('no flags provided', () => {
    when('execUpgrade is called', () => {
      then(
        'defaults to self=true, roleSpecs=["*"], brainSpecs=["*"]',
        async () => {
          await execUpgrade({}, context);

          // should upgrade rhachet + discovered roles + discovered brains
          expect(mockExecNpmInstallLocal).toHaveBeenCalledWith(
            {
              packages: [
                'rhachet',
                'rhachet-roles-ehmpathy',
                'rhachet-brains-anthropic',
              ],
              // 🚨 asserted, never omitted. `toHaveBeenCalledWith` is a deep equality,
              //   so every row below must state the hook decision too — which means the
              //   extant suite now clamps it: a future edit that swaps the value, or
              //   that re-hardcodes the flag and drops the field, goes red here
              lifecycleHooks: 'skip',
            },
            context,
          );
          expect(mockExpandRoleSupplierSlugs).toHaveBeenCalledWith(
            { specs: ['*'] },
            context,
          );
          expect(mockResolveBrainsToPackages).toHaveBeenCalledWith(
            { specs: ['*'] },
            context,
          );
        },
      );

      then('returns upgradedSelf=true and upgradedBrains', async () => {
        const result = await execUpgrade({}, context);
        expect(result.upgradedSelf.local).toBe(true);
        expect(result.upgradedBrains).toEqual(['anthropic']);
      });
    });
  });

  given('--self flag only', () => {
    beforeEach(() => {
      // reset mocks for this case: no roles or brains to resolve
      mockExpandRoleSupplierSlugs.mockResolvedValue({
        packages: [],
        linkedRoles: [],
        slugs: [],
      });
      mockResolveBrainsToPackages.mockResolvedValue([]);
    });

    when('execUpgrade is called', () => {
      then('upgrades rhachet only, no roles, no brains', async () => {
        await execUpgrade({ self: true }, context);

        expect(mockExecNpmInstallLocal).toHaveBeenCalledWith(
          { packages: ['rhachet'], lifecycleHooks: 'skip' },
          context,
        );
        expect(mockInitRolesFromPackages).not.toHaveBeenCalled();
        expect(mockResolveBrainsToPackages).toHaveBeenCalledWith(
          { specs: [] },
          context,
        );
      });
    });
  });

  given('--roles * flag (no brains)', () => {
    beforeEach(() => {
      // no brains when only --roles is specified
      mockResolveBrainsToPackages.mockResolvedValue([]);
    });

    when('execUpgrade is called', () => {
      then('resolves wildcard via expandRoleSupplierSlugs', async () => {
        await execUpgrade({ roleSpecs: ['*'] }, context);

        expect(mockExpandRoleSupplierSlugs).toHaveBeenCalledWith(
          { specs: ['*'] },
          context,
        );
        expect(mockExecNpmInstallLocal).toHaveBeenCalledWith(
          { packages: ['rhachet-roles-ehmpathy'], lifecycleHooks: 'skip' },
          context,
        );
      });

      then('re-initializes only linked roles after upgrade', async () => {
        await execUpgrade({ roleSpecs: ['*'] }, context);

        expect(mockInitRolesFromPackages).toHaveBeenCalledWith(
          { specifiers: ['ehmpathy/mechanic'] },
          context,
        );
      });

      then('returns upgradedSelf=false and no brains upgraded', async () => {
        const result = await execUpgrade({ roleSpecs: ['*'] }, context);
        expect(result.upgradedSelf.local).toBe(false);
        expect(result.upgradedBrains).toEqual([]);
      });

      then(
        'does NOT upgrade brains (regression test for usecase.9)',
        async () => {
          await execUpgrade({ roleSpecs: ['*'] }, context);

          // brainSpecs should be [] when only --roles is specified
          expect(mockResolveBrainsToPackages).toHaveBeenCalledWith(
            { specs: [] },
            context,
          );
        },
      );
    });
  });

  given('--roles ehmpathy flag (explicit repo slug)', () => {
    when('execUpgrade is called', () => {
      then('passes spec to expandRoleSupplierSlugs', async () => {
        await execUpgrade({ roleSpecs: ['ehmpathy'] }, context);

        expect(mockExpandRoleSupplierSlugs).toHaveBeenCalledWith(
          { specs: ['ehmpathy'] },
          context,
        );
      });
    });
  });

  given('--roles ehmpathy/mechanic flag (explicit repo/role)', () => {
    when('execUpgrade is called', () => {
      then('passes repo/role format to expandRoleSupplierSlugs', async () => {
        await execUpgrade({ roleSpecs: ['ehmpathy/mechanic'] }, context);

        expect(mockExpandRoleSupplierSlugs).toHaveBeenCalledWith(
          { specs: ['ehmpathy/mechanic'] },
          context,
        );
      });
    });
  });

  given('--roles rhachet-roles-ehmpathy flag (full package name)', () => {
    when('execUpgrade is called', () => {
      then('passes full package name to expander', async () => {
        await execUpgrade({ roleSpecs: ['rhachet-roles-ehmpathy'] }, context);

        expect(mockExpandRoleSupplierSlugs).toHaveBeenCalledWith(
          { specs: ['rhachet-roles-ehmpathy'] },
          context,
        );
      });
    });
  });

  given('--self --roles mechanic flags (both, no brains)', () => {
    beforeEach(() => {
      // no brains when self and roles are specified
      mockResolveBrainsToPackages.mockResolvedValue([]);
    });

    when('execUpgrade is called', () => {
      then('upgrades both rhachet and roles', async () => {
        await execUpgrade({ self: true, roleSpecs: ['mechanic'] }, context);

        expect(mockExecNpmInstallLocal).toHaveBeenCalledWith(
          {
            packages: ['rhachet', 'rhachet-roles-ehmpathy'],
            lifecycleHooks: 'skip',
          },
          context,
        );
      });
    });
  });

  given('multiple role specs provided', () => {
    beforeEach(() => {
      mockResolveBrainsToPackages.mockResolvedValue([]);
    });

    when('execUpgrade is called', () => {
      then(
        'passes all specs to expander (deduplication happens in expander)',
        async () => {
          await execUpgrade({ roleSpecs: ['ehmpathy', '*'] }, context);

          // specs are passed through; deduplication is expander responsibility
          expect(mockExpandRoleSupplierSlugs).toHaveBeenCalledWith(
            { specs: ['ehmpathy', '*'] },
            context,
          );
        },
      );
    });
  });

  given('no linked roles to reinit', () => {
    beforeEach(() => {
      mockResolveBrainsToPackages.mockResolvedValue([]);
      mockExpandRoleSupplierSlugs.mockResolvedValue({
        packages: ['rhachet-roles-ehmpathy'],
        linkedRoles: [], // no linked roles
        slugs: ['ehmpathy/*'] as any,
      });
    });

    when('execUpgrade is called with --roles *', () => {
      then('skips initRolesFromPackages', async () => {
        await execUpgrade({ roleSpecs: ['*'] }, context);

        expect(mockInitRolesFromPackages).not.toHaveBeenCalled();
      });
    });
  });

  given('package has file:. dependency for a role package', () => {
    beforeEach(() => {
      mockGetLocalRefDependencies.mockReturnValue(
        new Set(['rhachet-roles-ehmpathy']),
      );
      mockResolveBrainsToPackages.mockResolvedValue([]);
    });

    when('execUpgrade is called with --roles *', () => {
      then('excludes file:. packages from install', async () => {
        await execUpgrade({ roleSpecs: ['*'] }, context);

        // should NOT include rhachet-roles-ehmpathy
        expect(mockExecNpmInstallLocal).not.toHaveBeenCalled();
      });

      then(
        'still re-initializes linked roles from excluded packages',
        async () => {
          await execUpgrade({ roleSpecs: ['*'] }, context);

          // should still link/init the role
          expect(mockInitRolesFromPackages).toHaveBeenCalledWith(
            { specifiers: ['ehmpathy/mechanic'] },
            context,
          );
        },
      );
    });
  });

  given('rhachet itself has file:. dependency', () => {
    beforeEach(() => {
      mockGetLocalRefDependencies.mockReturnValue(new Set(['rhachet']));
      mockExpandRoleSupplierSlugs.mockResolvedValue({
        packages: [],
        linkedRoles: [],
        slugs: [],
      });
      mockResolveBrainsToPackages.mockResolvedValue([]);
    });

    when('execUpgrade is called with --self', () => {
      then('excludes rhachet from install', async () => {
        await execUpgrade({ self: true }, context);

        // should NOT call execNpmInstall at all
        expect(mockExecNpmInstallLocal).not.toHaveBeenCalled();
      });
    });
  });

  given('mixed file:. and regular dependencies', () => {
    beforeEach(() => {
      mockGetLocalRefDependencies.mockReturnValue(
        new Set(['rhachet-roles-ehmpathy']),
      );
      mockExpandRoleSupplierSlugs.mockResolvedValue({
        packages: ['rhachet-roles-ehmpathy', 'rhachet-roles-bhuild'],
        linkedRoles: [
          { repo: 'ehmpathy', role: 'mechanic' },
          { repo: 'bhuild', role: 'behaver' },
        ],
        slugs: ['ehmpathy/*', 'bhuild/*'] as any,
      });
      mockResolveBrainsToPackages.mockResolvedValue([]);
    });

    when('execUpgrade is called with --roles *', () => {
      then('installs only non-file:. packages', async () => {
        await execUpgrade({ roleSpecs: ['*'] }, context);

        // should only include rhachet-roles-bhuild
        expect(mockExecNpmInstallLocal).toHaveBeenCalledWith(
          { packages: ['rhachet-roles-bhuild'], lifecycleHooks: 'skip' },
          context,
        );
      });
    });
  });

  given('--brains * flag', () => {
    beforeEach(() => {
      mockExpandRoleSupplierSlugs.mockResolvedValue({
        packages: [],
        linkedRoles: [],
        slugs: [],
      });
      mockResolveBrainsToPackages.mockResolvedValue([
        'rhachet-brains-anthropic',
        'rhachet-brains-opencode',
      ]);
    });

    when('execUpgrade is called', () => {
      then('expands wildcard to all brain packages', async () => {
        await execUpgrade({ brainSpecs: ['*'] }, context);

        expect(mockResolveBrainsToPackages).toHaveBeenCalledWith(
          { specs: ['*'] },
          context,
        );
        expect(mockExecNpmInstallLocal).toHaveBeenCalledWith(
          {
            packages: ['rhachet-brains-anthropic', 'rhachet-brains-opencode'],
            lifecycleHooks: 'skip',
          },
          context,
        );
      });

      then('returns upgradedBrains with all brain slugs', async () => {
        const result = await execUpgrade({ brainSpecs: ['*'] }, context);

        expect(result.upgradedBrains).toEqual(['anthropic', 'opencode']);
      });

      then('does NOT upgrade self or roles', async () => {
        const result = await execUpgrade({ brainSpecs: ['*'] }, context);

        expect(result.upgradedSelf.local).toBe(false);
        expect(result.upgradedRoles).toEqual([]);
      });
    });
  });

  given('--brains anthropic flag (explicit brain)', () => {
    beforeEach(() => {
      mockExpandRoleSupplierSlugs.mockResolvedValue({
        packages: [],
        linkedRoles: [],
        slugs: [],
      });
      mockResolveBrainsToPackages.mockResolvedValue([
        'rhachet-brains-anthropic',
      ]);
    });

    when('execUpgrade is called', () => {
      then('resolves single brain slug to package', async () => {
        await execUpgrade({ brainSpecs: ['anthropic'] }, context);

        expect(mockResolveBrainsToPackages).toHaveBeenCalledWith(
          { specs: ['anthropic'] },
          context,
        );
        expect(mockExecNpmInstallLocal).toHaveBeenCalledWith(
          { packages: ['rhachet-brains-anthropic'], lifecycleHooks: 'skip' },
          context,
        );
      });

      then('returns upgradedBrains with single slug', async () => {
        const result = await execUpgrade(
          { brainSpecs: ['anthropic'] },
          context,
        );

        expect(result.upgradedBrains).toEqual(['anthropic']);
      });
    });
  });

  given('--brains * --roles * flags (both)', () => {
    beforeEach(() => {
      mockResolveBrainsToPackages.mockResolvedValue([
        'rhachet-brains-anthropic',
      ]);
    });

    when('execUpgrade is called', () => {
      then('upgrades both roles and brains', async () => {
        await execUpgrade({ roleSpecs: ['*'], brainSpecs: ['*'] }, context);

        expect(mockExecNpmInstallLocal).toHaveBeenCalledWith(
          {
            packages: ['rhachet-roles-ehmpathy', 'rhachet-brains-anthropic'],
            lifecycleHooks: 'skip',
          },
          context,
        );
      });

      then('returns both upgradedRoles and upgradedBrains', async () => {
        const result = await execUpgrade(
          { roleSpecs: ['*'], brainSpecs: ['*'] },
          context,
        );

        expect(result.upgradedSelf.local).toBe(false);
        expect(result.upgradedRoles).toEqual(['ehmpathy/*']);
        expect(result.upgradedBrains).toEqual(['anthropic']);
      });
    });
  });

  given('package has file:. dependency for a brain package', () => {
    beforeEach(() => {
      mockGetLocalRefDependencies.mockReturnValue(
        new Set(['rhachet-brains-anthropic']),
      );
      mockExpandRoleSupplierSlugs.mockResolvedValue({
        packages: [],
        linkedRoles: [],
        slugs: [],
      });
      mockResolveBrainsToPackages.mockResolvedValue([
        'rhachet-brains-anthropic',
      ]);
    });

    when('execUpgrade is called with --brains *', () => {
      then('excludes file:. brain packages from install', async () => {
        await execUpgrade({ brainSpecs: ['*'] }, context);

        // should NOT call execNpmInstall since only package is excluded
        expect(mockExecNpmInstallLocal).not.toHaveBeenCalled();
      });

      then('excludes file:. brains from upgradedBrains result', async () => {
        const result = await execUpgrade({ brainSpecs: ['*'] }, context);

        // file:. brain should not appear in result
        expect(result.upgradedBrains).toEqual([]);
      });
    });
  });

  given('mixed file:. and regular brain dependencies', () => {
    beforeEach(() => {
      mockGetLocalRefDependencies.mockReturnValue(
        new Set(['rhachet-brains-anthropic']),
      );
      mockExpandRoleSupplierSlugs.mockResolvedValue({
        packages: [],
        linkedRoles: [],
        slugs: [],
      });
      mockResolveBrainsToPackages.mockResolvedValue([
        'rhachet-brains-anthropic',
        'rhachet-brains-opencode',
      ]);
    });

    when('execUpgrade is called with --brains *', () => {
      then('installs only non-file:. brain packages', async () => {
        await execUpgrade({ brainSpecs: ['*'] }, context);

        // should only include rhachet-brains-opencode
        expect(mockExecNpmInstallLocal).toHaveBeenCalledWith(
          { packages: ['rhachet-brains-opencode'], lifecycleHooks: 'skip' },
          context,
        );
      });

      then('only includes non-file:. brains in result', async () => {
        const result = await execUpgrade({ brainSpecs: ['*'] }, context);

        expect(result.upgradedBrains).toEqual(['opencode']);
      });
    });
  });

  // --which flag tests
  given('--which local flag', () => {
    when('execUpgrade is called with --which local', () => {
      then('upgrades local only, skips global', async () => {
        const result = await execUpgrade({ which: 'local' }, context);

        expect(mockExecNpmInstallLocal).toHaveBeenCalled();
        expect(mockExecNpmInstallGlobal).not.toHaveBeenCalled();
        expect(result.upgradedSelf.global).toBeNull();
      });
    });
  });

  given('--which global flag', () => {
    beforeEach(() => {
      mockExpandRoleSupplierSlugs.mockResolvedValue({
        packages: [],
        linkedRoles: [],
        slugs: [],
      });
      mockResolveBrainsToPackages.mockResolvedValue([]);
    });

    when('execUpgrade is called with --which global', () => {
      then('upgrades global only, skips local', async () => {
        const result = await execUpgrade({ which: 'global' }, context);

        expect(mockExecNpmInstallLocal).not.toHaveBeenCalled();
        expect(mockExecNpmInstallGlobal).toHaveBeenCalledWith({
          packages: ['rhachet'],
        });
        expect(result.upgradedSelf.global).toEqual({ upgraded: true });
        expect(result.upgradedSelf.local).toBe(false);
        expect(result.upgradedRoles).toEqual([]);
        expect(result.upgradedBrains).toEqual([]);
      });
    });

    when('global rhachet is not installed', () => {
      beforeEach(() => {
        mockGetGlobalRhachetVersion.mockReturnValue(null);
      });

      then('skips global upgrade silently', async () => {
        const result = await execUpgrade({ which: 'global' }, context);

        expect(mockExecNpmInstallGlobal).not.toHaveBeenCalled();
        expect(result.upgradedSelf.global).toBeNull();
      });
    });
  });

  given('--which both flag', () => {
    when('execUpgrade is called with --which both', () => {
      then('upgrades both local and global', async () => {
        const result = await execUpgrade({ which: 'both' }, context);

        expect(mockExecNpmInstallLocal).toHaveBeenCalled();
        expect(mockExecNpmInstallGlobal).toHaveBeenCalledWith({
          packages: ['rhachet'],
        });
        expect(result.upgradedSelf.global).toEqual({ upgraded: true });
      });
    });
  });

  given('no --which flag (default behavior)', () => {
    when('invoked via npx', () => {
      beforeEach(() => {
        mockDetectInvocationMethod.mockReturnValue('npx');
      });

      then('defaults to local only', async () => {
        const result = await execUpgrade({}, context);

        expect(mockExecNpmInstallLocal).toHaveBeenCalled();
        expect(mockExecNpmInstallGlobal).not.toHaveBeenCalled();
        expect(result.upgradedSelf.global).toBeNull();
      });
    });

    when('invoked via global install (rhx)', () => {
      beforeEach(() => {
        mockDetectInvocationMethod.mockReturnValue('global');
      });

      then('defaults to both local and global', async () => {
        const result = await execUpgrade({}, context);

        expect(mockExecNpmInstallLocal).toHaveBeenCalled();
        expect(mockExecNpmInstallGlobal).toHaveBeenCalledWith({
          packages: ['rhachet'],
        });
        expect(result.upgradedSelf.global).toEqual({ upgraded: true });
      });
    });
  });

  given('global upgrade fails with permission error', () => {
    // 🚨 the throw routes through `asNpmInstallFailureError` — the SAME transformer the
    //   producer calls — never a hand-written error of the test's own.
    //
    //   the prior version of this block invented a message that held 'EACCES' and
    //   asserted the consumer parsed it out. but `execNpmInstallGlobal` could never
    //   emit that text, so the test verified a seam that did not exist: two green
    //   suites, mocked on both sides, over a classifier that was dead in production.
    //
    //   a mock may stand in for a collaborator. it may not invent a contract the
    //   collaborator cannot honor. to build the throw from the producer's own
    //   transformer is what makes that impossible here rather than merely discouraged.
    beforeEach(() => {
      mockExecNpmInstallGlobal.mockImplementation(() => {
        throw asNpmInstallFailureError({
          kind: 'permission-denied',
          target: 'global',
          packageManager: 'pnpm',
          exitCode: 1,
          output: 'ERR_PNPM_EACCES  EACCES: permission denied',
          packages: ['rhachet'],
          shellPresence: 'absent',
        });
      });
    });

    when('execUpgrade is called with --which both', () => {
      then(
        'warns and continues — local not blocked by global failure',
        async () => {
          const result = await execUpgrade({ which: 'both' }, context);

          // local upgrade should succeed
          expect(result.upgradedSelf.local).toBe(true);

          // global upgrade should report failure.
          // .note = the class name prefixes the message because the error is a
          //   HelpfulError, which is the same render the clone path already emits
          //   (`💥 MalfunctionError: …`). it reads `ConstraintError` because a permission
          //   wall is the CALLER's to fix — and that class is also what makes the process
          //   exit 2 rather than 1 (rule.require.exit-code-semantics). the `✋` glyph is
          //   the palette's own mark for a constraint, so the render says WHOSE problem
          //   it is before a word of the sentence is read.
          // .note = the SERIALIZED METADATA is deliberately absent: `execUpgrade` redacts
          //   it, because `output` carries the package manager's whole captured log and
          //   this field reaches a human
          expect(result.upgradedSelf.global).toEqual({
            upgraded: false,
            error:
              '✋ ConstraintError: pnpm global install failed with exit code 1 — permission denied. retry with elevated permissions, or point pnpm at a prefix you own.',
          });
        },
      );

      then(
        'the header calls it a FAILURE, because the cause is classified',
        async () => {
          const { logs } = await runUpgradeCaptured({ which: 'both' });

          const header = logs.find((line) =>
            line.includes('rhachet upgrade globally'),
          );
          expect(header).toContain('✗');
          expect(header).toContain('failed');
        },
      );

      then('the printed lines still NAME THE FIX', async () => {
        // 🚨 THE CLAMP for the dropped hint, and the reason this then exists.
        //   a prior shape printed the bare literal 'permission denied' on THIS branch
        //   while the very next branch printed its own hint in full — so the one path
        //   with an actionable cure was the one path that withheld it. the header
        //   assertions above stayed green throughout, because they read only the header.
        //
        //   the mutation that reddens this: substitute a literal for `message` on the
        //   permission branch. the snapshot goes red on the changed line, and the
        //   explicit assertion names WHICH property was lost.
        const { logs } = await runUpgradeCaptured({ which: 'both' });

        const lines = asCalloutBlockFromLogs({
          logs,
          headerHolds: 'rhachet upgrade globally',
        });

        // the explicit assertion, so a red names the lost property rather than a diff
        expect(lines.join('\n')).toContain(
          'retry with elevated permissions, or point pnpm at a prefix you own',
        );

        // and the snapshot, so the whole human-faced render is reviewable in a diff
        expect(lines).toMatchSnapshot();
      });
    });
  });

  given('[case1p] a failure whose sentence TERMINATES ITSELF', () => {
    // 🚨 THE CLAMP for doubled punctuation, and the reason this given exists.
    //
    //   `asUpgradeFailureMessage` joins a sentence to a hint, and both come from another
    //   party — a `HelpfulError` raised anywhere in the tree. neither is forbidden its own
    //   `.`/`?`/`!`, so a join that APPENDS a period renders `denied.. retry…` the moment
    //   one arrives that already ends. every extant row here happens to use an
    //   unterminated sentence, which is why the defect was invisible to a green suite.
    //
    //   the mutation that reddens this: restore the join to `${sentence}. ${hint}.`
    //   both assertions below catch it — the `not.toContain` on the doubled mark, and
    //   the positive on the single one.
    beforeEach(() => {
      mockExecNpmInstallGlobal.mockImplementation(() => {
        throw new ConstraintError(
          'the registry refused the request. it named no reason.',
          { hint: 'retry once, then report it if it repeats.' },
        );
      });
    });

    when('execUpgrade renders it for a human', () => {
      then('neither clause is given a second terminator', async () => {
        const result = await execUpgrade({ which: 'both' }, context);
        const message = result.upgradedSelf.global?.error ?? '';

        // the defect, named directly: a period that follows a period
        expect(message).not.toContain('..');

        // and the render it must produce instead — one terminator on each clause
        expect(message).toContain(
          'it named no reason. retry once, then report it if it repeats.',
        );
      });

      then('a clause with NO terminator still receives one', async () => {
        mockExecNpmInstallGlobal.mockImplementation(() => {
          throw new ConstraintError('the registry refused the request', {
            hint: 'retry once',
          });
        });

        const result = await execUpgrade({ which: 'both' }, context);
        expect(result.upgradedSelf.global?.error ?? '').toContain(
          'the registry refused the request. retry once.',
        );
      });
    });
  });

  given('global upgrade exits nonzero with no classified cause', () => {
    // .why = THE CLAMP for the false-failure header. an exit the installer could not
    //   place must not be reported as a confident "✗ failed" — that is the
    //   opposite-direction twin of rule.forbid.failhide, and it sends a human to hunt
    //   a defect that may not be there.
    //
    //   the mutation that reddens this: revert the header to the unconditional
    //   '✗ rhachet upgrade globally failed'. the two negative assertions below each
    //   catch that exact text.
    beforeEach(() => {
      mockExecNpmInstallGlobal.mockImplementation(() => {
        throw asNpmInstallFailureError({
          kind: 'unclassified',
          target: 'global',
          packageManager: 'pnpm',
          exitCode: 1,
          output: 'some failure we have never seen before',
          packages: ['rhachet'],
          shellPresence: 'absent',
        });
      });
    });

    when('execUpgrade is called with --which both', () => {
      then(
        'the header states only the exit, never an unqualified failure',
        async () => {
          const { logs } = await runUpgradeCaptured({ which: 'both' });

          const header = logs.find((line) =>
            line.includes('rhachet upgrade globally'),
          );

          // fail loud if the render vanished, rather than pass on an absent line
          expect(header).toBeDefined();

          // it reports what IS true — a nonzero exit, cause unknown
          expect(header).toContain('⚠️');
          expect(header).toContain('exited nonzero');
          expect(header).toContain('unclassified');

          // and it does NOT claim the failure it cannot confirm
          expect(header).not.toContain('✗');
          expect(header).not.toContain('failed');
        },
      );

      then('local upgrade is still unblocked', async () => {
        // .note = the capture is here to keep the suite quiet, never to be read — the
        //   claim is about the RETURN. the redirect is still the right instrument: a spy
        //   would replace the logger for every later row in the file if a restore were
        //   ever missed, where the redirect restores in a `finally`
        const { result } = await runUpgradeCaptured({ which: 'both' });

        expect(result.upgradedSelf.local).toBe(true);
      });
    });
  });

  given('global upgrade fails with EVERY cause the classifier CAN name', () => {
    // 🚨 THE DRIFT CLAMP for the header, and the reason this block exists at all.
    //
    //   the header used to be a BINARY ternary — `permission-denied` on one side, each
    //   other kind on the other — written when those were the only two members. when
    //   `package-absent` and `timed-out` were added to the union they fell to the else,
    //   so a human whose slug was typo'd read *"cause unclassified"* directly above a
    //   sentence that named the registry 404. the cause was classified and then discarded
    //   at the one line a human reads (`rule.forbid.failhide`).
    //
    //   ⚠️ this is the THIRD reader of this union to drift the same way — the first was
    //   `asNpmInstallFailureKindFromError`'s hand-copied `||` chain. a fix that merely
    //   added two arms would re-arm the trap for member six, so the cure tests the ONE
    //   member that means "unknown" and this row proves it over the WHOLE union.
    //
    //   so this does NOT enumerate the kinds — it reads the same list the union is
    //   derived from, minus the two that cannot reach this render:
    //     - `unclassified`       is the one kind that SHOULD say unclassified (covered above)
    //     - `build-gate-blocked` is not a failure, so it never reaches the catch at all
    //
    //   the mutation that reddens this: restore `kind === 'permission-denied'` as the
    //   test in `asGlobalUpgradeFailureHeader`. every kind but that one goes red.
    // .why = a type PREDICATE, never a bare filter — `Array.filter` does not narrow, and
    //   `asNpmInstallFailureError` declares its input as
    //   `Exclude<NpmInstallFailureKind, 'build-gate-blocked'>`. so the predicate makes the
    //   exclusion type-level and the compiler holds this row to the producer's own
    //   contract, rather than a cast that would let a future unreachable kind through
    const kindsNameable = NPM_INSTALL_FAILURE_KINDS.filter(
      (
        kind,
      ): kind is Exclude<
        NpmInstallFailureKind,
        'unclassified' | 'build-gate-blocked'
      > => kind !== 'unclassified' && kind !== 'build-gate-blocked',
    );

    for (const kind of kindsNameable) {
      when(`[t0] the installer classified it as '${kind}'`, () => {
        beforeEach(() => {
          mockExecNpmInstallGlobal.mockImplementation(() => {
            throw asNpmInstallFailureError({
              kind,
              target: 'global',
              packageManager: 'pnpm',
              exitCode: 1,
              output: `a real ${kind} report`,
              packages: ['rhachet'],
              shellPresence: 'absent',
            });
          });
        });

        then('the header NEVER claims the cause is unclassified', async () => {
          const { logs } = await runUpgradeCaptured({ which: 'both' });

          const header = logs.find((line) =>
            line.includes('rhachet upgrade globally'),
          );

          // fail loud if the render vanished, rather than pass on an absent line
          expect(header).toBeDefined();

          // 🚨 the contradiction itself: the cause IS named one line below
          expect(header).not.toContain('unclassified');

          // and it says what is true of every branch that reaches this catch
          expect(header).toContain('✗');
          expect(header).toContain('failed');
        });
      });
    }
  });

  given('global upgrade throws a value `String()` cannot render', () => {
    /**
     * 🚨 THE CLAMP for the warn-and-continue contract itself, not merely for its text.
     *
     *   the render runs INSIDE the catch that exists to keep local unblocked
     *   (`usecase.3`). a fault THERE does not degrade the report — it escapes the catch,
     *   so `execUpgrade` throws, the human gets no failure report at all, AND the local
     *   upgrade the catch was written to protect never runs. one render fault takes both.
     *
     *   the mutation that reddens this: revert `asUpgradeFailureMessage`'s last rung to a
     *   bare `String(input.error)`.
     *
     * ⚠️ only the HOSTILE row reddens under that mutation, and the asymmetry is recorded
     *   rather than papered over. `String(value)` carves symbols out and renders them, so
     *   the symbol row passes either way — it clamps the metadata shape, never the fault.
     *   this block was first authored under the belief that both rows bit, which is
     *   exactly the kind of claim `rule.require.clamp-edge-cases` demands be dogfooded
     *   instead of assumed. the premise now has its own measurement in
     *   `asThrownValueText.test.ts`.
     */
    const casesUnrenderable = [
      {
        slug: 'an object whose own `toString` throws — the row with TEETH',
        thrown: {
          toString: () => {
            throw new Error('i refuse to render');
          },
        },
        expect: '[object Object]',
      },
      {
        slug: 'a symbol — a shape clamp; `String()` renders it either way',
        thrown: Symbol('the-registry-refused'),
        expect: 'Symbol(the-registry-refused)',
      },
    ];

    for (const caseUnrenderable of casesUnrenderable) {
      when(`[t0] the installer throws ${caseUnrenderable.slug}`, () => {
        beforeEach(() => {
          mockExecNpmInstallGlobal.mockImplementation(() => {
            throw caseUnrenderable.thrown;
          });
        });

        then('the failure report still reaches the human', async () => {
          const { logs, result } = await runUpgradeCaptured({ which: 'both' });

          // the header renders — an unreadable throw carries no kind, so it is the
          // honest `unclassified` row rather than a failure we cannot confirm
          const header = logs.find((line) =>
            line.includes('rhachet upgrade globally'),
          );
          expect(header).toBeDefined();
          expect(header).toContain('exited nonzero');

          // and the DETAIL renders the thrown value, rather than a fault upon it
          expect(
            logs.find((line) => line.includes(caseUnrenderable.expect)),
          ).toBeDefined();
          expect(result.upgradedSelf.global?.error).toContain(
            caseUnrenderable.expect,
          );
        });

        then('local upgrade is still unblocked', async () => {
          const { result } = await runUpgradeCaptured({ which: 'both' });

          // 🚨 the half a text-only assertion would miss. a render fault escapes the
          //   catch, so this line never runs at all — the contract, not the copy
          expect(result.upgradedSelf.local).toBe(true);
        });
      });
    }
  });
});
