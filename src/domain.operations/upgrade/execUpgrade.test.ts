import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { genSampleErrnoError } from '@src/.test/assets/genSampleErrnoError';
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
// .note = the error CLASS stays real; only the producer function is mocked, so the
//   suite exercises the actual error shape
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
/**
 * .what = the ONE collaborator replaced here; the rest of the module stays real
 * .why = this suite needs the hook sync to FAULT — it aggregates per-brain faults into
 *   `errors` rather than a throw, so a suite that cannot drive that channel cannot
 *   clamp whether `execUpgrade` reads it
 */
jest.mock('@src/domain.operations/init/hooks/syncHooksForLinkedRoles', () => ({
  ...jest.requireActual(
    '@src/domain.operations/init/hooks/syncHooksForLinkedRoles',
  ),
  syncHooksForLinkedRoles: jest.fn(),
}));

/**
 * .what = the boot sync, replaced as narrowly as the hook sync above — the default is the REAL one
 * .why = the hook sync runs only once the default boot rendered (`defaultRendered` gates it),
 *   and against this suite's `/test` cwd the real render never lands. a case that drives a
 *   hook-sync fault opens that gate explicitly
 */
jest.mock(
  '@src/domain.operations/init/boots/syncAndReportBrainDirBoots',
  () => ({
    ...jest.requireActual(
      '@src/domain.operations/init/boots/syncAndReportBrainDirBoots',
    ),
    syncAndReportBrainDirBoots: jest.fn(),
  }),
);

import { syncAndReportBrainDirBoots } from '@src/domain.operations/init/boots/syncAndReportBrainDirBoots';
import { syncHooksForLinkedRoles } from '@src/domain.operations/init/hooks/syncHooksForLinkedRoles';
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
 * .what = the callout block around a header line in a captured console log — the blank
 *   above the header, the header, its indented message, and the blank below
 * .why = bounded to the four lines the branch composes, so an unrelated log line
 *   elsewhere in the file does not enter this clamp
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
// the TYPE stays real, so a shape change on `syncHooksForLinkedRoles`' return reddens
// this suite at typecheck rather than passing against a fiction
const spySyncHooksForLinkedRoles =
  syncHooksForLinkedRoles as jest.MockedFunction<
    typeof syncHooksForLinkedRoles
  >;
const spySyncAndReportBrainDirBoots =
  syncAndReportBrainDirBoots as jest.MockedFunction<
    typeof syncAndReportBrainDirBoots
  >;
const {
  syncAndReportBrainDirBoots: syncAndReportBrainDirBootsActual,
}: {
  syncAndReportBrainDirBoots: typeof syncAndReportBrainDirBoots;
} = jest.requireActual(
  '@src/domain.operations/init/boots/syncAndReportBrainDirBoots',
);

describe('execUpgrade', () => {
  const context = new ContextCli({ cwd: '/test', gitroot: '/test' });

  /**
   * .what = runs one upgrade with the console redirected, and hands back both the lines it
   *   printed and what it returned
   * .why = a real stream redirect (`withCapturedStreams`) swaps in a real node `Console`
   *   whose streams are in-memory sinks, so every render path is captured, including one
   *   that reaches `process.stdout` outside a mocked `console.log`
   * .note = lines are split on newlines, so a single `console.log` call with an embedded
   *   newline reads here as the two lines a human actually sees
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
    // default: hooks sync clean, so every extant case reads exactly as before
    spySyncHooksForLinkedRoles.mockResolvedValue({ errors: [] });
    // default: the real boot sync, so every extant case reads exactly as before
    spySyncAndReportBrainDirBoots.mockImplementation(
      syncAndReportBrainDirBootsActual,
    );
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
              // asserted, never omitted — `toHaveBeenCalledWith` is a deep equality, so
              // this clamps the hook decision alongside the package list
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

      then('hookErrors is EMPTY — no hooks were synced at all', async () => {
        // the empty array means "not run", never "ran clean" — hookErrors is present
        // on every path, even the one that skipped the sync
        const result = await execUpgrade({ roleSpecs: ['*'] }, context);
        expect(spySyncHooksForLinkedRoles).not.toHaveBeenCalled();
        expect(result.hookErrors).toEqual([]);
      });
    });
  });

  /**
   * .what = a hook sync that FAULTS while the upgrade itself lands
   * .why = the hook sync aggregates per-brain faults into `errors` rather than a throw,
   *   so a bare await would swallow them and report success over hooks that never wrote.
   *   the fault is a warn, never a throw — it must not undo a local upgrade that
   *   already landed on disk
   */
  given('[case1h] the hook sync FAULTS after a local upgrade lands', () => {
    beforeEach(() => {
      // the default boot rendered, so the gate opens and the hook sync runs
      spySyncAndReportBrainDirBoots.mockResolvedValue({
        exitCode: 0,
        defaultRendered: true,
      });
      spySyncHooksForLinkedRoles.mockResolvedValue({
        errors: [
          {
            source: 'sync:ehmpathy/mechanic→claude-code',
            error: genSampleErrnoError({
              code: 'EROFS',
              message: 'settings.json is read-only',
            }),
          },
          {
            source: 'sync:actor=abc1234:ehmpathy/mechanic→claude-code',
            error: genSampleErrnoError({
              code: 'EROFS',
              message: 'actor config dir is read-only',
            }),
          },
        ],
      });
    });

    when('execUpgrade is called', () => {
      then(
        'it prints NO second header — the sync owns the one render of the set',
        async () => {
          // the sync rendered each fault and the one header already; a reprint here is the
          //   three-headers-on-two-streams defect this case clamps
          const { logs } = await runUpgradeCaptured({});
          expect(logs.some((line) => line.includes('hook sync error'))).toBe(
            false,
          );
        },
      );

      then('the faults are CARRIED on the result, never dropped', async () => {
        const { result } = await runUpgradeCaptured({});
        expect(result.hookErrors).toHaveLength(2);
        expect(result.hookErrors.map((e) => e.source)).toEqual([
          'sync:ehmpathy/mechanic→claude-code',
          'sync:actor=abc1234:ehmpathy/mechanic→claude-code',
        ]);
      });

      then(
        'the local upgrade STILL succeeds — a warn, never a throw',
        async () => {
          const { result } = await runUpgradeCaptured({});
          expect(result.upgradedSelf.local).toBe(true);
        },
      );
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
    // the throw routes through `asNpmInstallFailureError`, the same transformer the
    // producer calls
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
          // .note = the class is `ConstraintError` because a permission wall is the
          //   caller's to fix, which is also what sets the exit code to 2 rather than 1
          // .note = the serialized metadata is absent — `execUpgrade` redacts it before
          //   the message reaches a human
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
        // the clamp: the permission branch prints `message` in full, not a bare literal
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
    // the clamp: a sentence and a hint are joined with `.` — if either already ends
    // with its own terminator, an unconditional join doubles it (`denied.. retry…`)
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
    // .why = an exit the installer could not classify must not be reported as a
    //   confident "✗ failed" — that would send a human to hunt a defect that may not
    //   be there
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
    // .why = the header must never claim "unclassified" for a cause the classifier DID
    //   name. this row walks every kind the union declares except `unclassified` and
    //   `build-gate-blocked` (the latter is not a failure, so it never reaches this catch)
    // .why = a type predicate keeps the exclusion type-level, so the compiler holds
    //   this row to the producer's own contract
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
     * .why = the render happens inside the catch that keeps the local upgrade unblocked
     *   — a fault there must not escape the catch, or the local upgrade it protects
     *   never runs. the hostile row (an object whose `toString` throws) clamps that
     *   fault; the symbol row clamps the metadata shape
     */
    const casesUnrenderable = [
      {
        slug: 'an object whose own `toString` throws — the row with TEETH',
        thrown: {
          toString: () => {
            throw new MalfunctionError('i refuse to render');
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

          // a render fault would escape the catch, so this line would never run
          expect(result.upgradedSelf.local).toBe(true);
        });
      });
    }
  });
});
