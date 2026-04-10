import { given, then, when } from 'test-fns';

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
jest.mock('./execNpmInstallGlobal', () => ({
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
jest.mock('@src/domain.operations/init/initRolesFromPackages', () => ({
  initRolesFromPackages: jest.fn(),
}));

import { initRolesFromPackages } from '@src/domain.operations/init/initRolesFromPackages';

import { detectInvocationMethod } from './detectInvocationMethod';
import { execNpmInstallGlobal } from './execNpmInstallGlobal';
import { execNpmInstallLocal } from './execNpmInstallLocal';
import { expandRoleSupplierSlugs } from './expandRoleSupplierSlugs';
import { getGlobalRhachetVersion } from './getGlobalRhachetVersion';
import { getLocalRefDependencies } from './getLocalRefDependencies';
import { resolveBrainsToPackages } from './resolveBrainsToPackages';

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
          { packages: ['rhachet'] },
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
          { packages: ['rhachet-roles-ehmpathy'] },
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
          { packages: ['rhachet', 'rhachet-roles-ehmpathy'] },
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
          { packages: ['rhachet-roles-bhuild'] },
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
          { packages: ['rhachet-brains-anthropic', 'rhachet-brains-opencode'] },
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
          { packages: ['rhachet-brains-anthropic'] },
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
          { packages: ['rhachet-brains-opencode'] },
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
    beforeEach(() => {
      mockExecNpmInstallGlobal.mockImplementation(() => {
        throw new Error('global install failed: npm ERR! code EACCES');
      });
    });

    when('execUpgrade is called with --which both', () => {
      then(
        'warns and continues — local not blocked by global failure',
        async () => {
          const result = await execUpgrade({ which: 'both' }, context);

          // local upgrade should succeed
          expect(result.upgradedSelf.local).toBe(true);

          // global upgrade should report failure
          expect(result.upgradedSelf.global).toEqual({
            upgraded: false,
            error: 'global install failed: npm ERR! code EACCES',
          });
        },
      );
    });
  });
});
