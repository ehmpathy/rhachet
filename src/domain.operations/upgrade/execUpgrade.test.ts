import { given, then, when } from 'test-fns';

import { ContextCli } from '@src/domain.objects/ContextCli';

import { execUpgrade } from './execUpgrade';

// mock dependencies
jest.mock('./discoverLinkedRoles', () => ({
  discoverLinkedRoles: jest.fn(),
}));
jest.mock('./resolveRolesToPackages', () => ({
  resolveRolesToPackages: jest.fn(),
}));
jest.mock('./execNpmInstall', () => ({
  execNpmInstall: jest.fn(),
}));
jest.mock('./getFileDotDependencies', () => ({
  getFileDotDependencies: jest.fn(),
}));
jest.mock('@src/domain.operations/init/initRolesFromPackages', () => ({
  initRolesFromPackages: jest.fn(),
}));

import { initRolesFromPackages } from '@src/domain.operations/init/initRolesFromPackages';

import { discoverLinkedRoles } from './discoverLinkedRoles';
import { execNpmInstall } from './execNpmInstall';
import { getFileDotDependencies } from './getFileDotDependencies';
import { resolveRolesToPackages } from './resolveRolesToPackages';

const mockDiscoverLinkedRoles = discoverLinkedRoles as jest.MockedFunction<
  typeof discoverLinkedRoles
>;
const mockResolveRolesToPackages =
  resolveRolesToPackages as jest.MockedFunction<typeof resolveRolesToPackages>;
const mockExecNpmInstall = execNpmInstall as jest.MockedFunction<
  typeof execNpmInstall
>;
const mockGetFileDotDependencies =
  getFileDotDependencies as jest.MockedFunction<typeof getFileDotDependencies>;
const mockInitRolesFromPackages = initRolesFromPackages as jest.MockedFunction<
  typeof initRolesFromPackages
>;

describe('execUpgrade', () => {
  const context = new ContextCli({ cwd: '/test', gitroot: '/test' });

  beforeEach(() => {
    jest.clearAllMocks();
    mockDiscoverLinkedRoles.mockReturnValue([
      { repo: 'ehmpathy', role: 'mechanic' },
    ]);
    mockResolveRolesToPackages.mockResolvedValue(['rhachet-roles-ehmpathy']);
    mockGetFileDotDependencies.mockReturnValue(new Set());
    mockInitRolesFromPackages.mockResolvedValue({
      rolesLinked: [],
      rolesInitialized: [],
      errors: [],
    });
  });

  given('no flags provided', () => {
    when('execUpgrade is called', () => {
      then('defaults to self=true and roleSpecs=["*"]', async () => {
        await execUpgrade({}, context);

        // should upgrade rhachet + discovered roles
        expect(mockExecNpmInstall).toHaveBeenCalledWith(
          { packages: ['rhachet', 'rhachet-roles-ehmpathy'] },
          context,
        );
        expect(mockDiscoverLinkedRoles).toHaveBeenCalled();
      });

      then('returns upgradedSelf=true', async () => {
        const result = await execUpgrade({}, context);
        expect(result.upgradedSelf).toBe(true);
      });
    });
  });

  given('--self flag only', () => {
    beforeEach(() => {
      // reset mocks for this case: no roles to resolve
      mockResolveRolesToPackages.mockResolvedValue([]);
    });

    when('execUpgrade is called', () => {
      then('upgrades rhachet only, no roles', async () => {
        await execUpgrade({ self: true }, context);

        expect(mockExecNpmInstall).toHaveBeenCalledWith(
          { packages: ['rhachet'] },
          context,
        );
        expect(mockDiscoverLinkedRoles).not.toHaveBeenCalled();
        expect(mockInitRolesFromPackages).not.toHaveBeenCalled();
      });
    });
  });

  given('--roles * flag', () => {
    when('execUpgrade is called', () => {
      then('expands wildcard via discoverLinkedRoles', async () => {
        await execUpgrade({ roleSpecs: ['*'] }, context);

        expect(mockDiscoverLinkedRoles).toHaveBeenCalled();
        expect(mockExecNpmInstall).toHaveBeenCalledWith(
          { packages: ['rhachet-roles-ehmpathy'] },
          context,
        );
      });

      then('re-initializes roles after upgrade', async () => {
        await execUpgrade({ roleSpecs: ['*'] }, context);

        expect(mockInitRolesFromPackages).toHaveBeenCalledWith(
          { specifiers: ['ehmpathy/mechanic'] },
          context,
        );
      });

      then('returns upgradedSelf=false', async () => {
        const result = await execUpgrade({ roleSpecs: ['*'] }, context);
        expect(result.upgradedSelf).toBe(false);
      });
    });
  });

  given('--roles mechanic flag (explicit role)', () => {
    when('execUpgrade is called', () => {
      then('parses role specifier correctly', async () => {
        await execUpgrade({ roleSpecs: ['mechanic'] }, context);

        expect(mockResolveRolesToPackages).toHaveBeenCalledWith(
          { roles: [{ repo: 'mechanic', role: 'mechanic' }] },
          context,
        );
      });
    });
  });

  given('--roles ehmpathy/mechanic flag (explicit repo/role)', () => {
    when('execUpgrade is called', () => {
      then('parses repo/role format correctly', async () => {
        await execUpgrade({ roleSpecs: ['ehmpathy/mechanic'] }, context);

        expect(mockResolveRolesToPackages).toHaveBeenCalledWith(
          { roles: [{ repo: 'ehmpathy', role: 'mechanic' }] },
          context,
        );
      });
    });
  });

  given('--self --roles mechanic flags (both)', () => {
    when('execUpgrade is called', () => {
      then('upgrades both rhachet and roles', async () => {
        await execUpgrade({ self: true, roleSpecs: ['mechanic'] }, context);

        expect(mockExecNpmInstall).toHaveBeenCalledWith(
          { packages: ['rhachet', 'rhachet-roles-ehmpathy'] },
          context,
        );
      });
    });
  });

  given('duplicate roles specified', () => {
    when('execUpgrade is called', () => {
      then('deduplicates roles', async () => {
        mockDiscoverLinkedRoles.mockReturnValue([
          { repo: 'ehmpathy', role: 'mechanic' },
          { repo: 'ehmpathy', role: 'tuner' },
        ]);

        await execUpgrade({ roleSpecs: ['ehmpathy/mechanic', '*'] }, context);

        // mechanic should only appear once
        expect(mockResolveRolesToPackages).toHaveBeenCalledWith(
          {
            roles: [
              { repo: 'ehmpathy', role: 'mechanic' },
              { repo: 'ehmpathy', role: 'tuner' },
            ],
          },
          context,
        );
      });
    });
  });

  given('no roles to upgrade', () => {
    when('execUpgrade is called with empty roles', () => {
      then('skips initRolesFromPackages', async () => {
        mockDiscoverLinkedRoles.mockReturnValue([]);
        mockResolveRolesToPackages.mockResolvedValue([]);

        await execUpgrade({ roleSpecs: ['*'] }, context);

        expect(mockInitRolesFromPackages).not.toHaveBeenCalled();
      });
    });
  });

  given('package has file:. dependency for a role package', () => {
    beforeEach(() => {
      mockGetFileDotDependencies.mockReturnValue(
        new Set(['rhachet-roles-ehmpathy']),
      );
    });

    when('execUpgrade is called with --roles *', () => {
      then('excludes file:. packages from install', async () => {
        await execUpgrade({ roleSpecs: ['*'] }, context);

        // should NOT include rhachet-roles-ehmpathy
        expect(mockExecNpmInstall).not.toHaveBeenCalled();
      });

      then('still re-initializes excluded roles', async () => {
        await execUpgrade({ roleSpecs: ['*'] }, context);

        // should still link/init the role
        expect(mockInitRolesFromPackages).toHaveBeenCalledWith(
          { specifiers: ['ehmpathy/mechanic'] },
          context,
        );
      });
    });
  });

  given('rhachet itself has file:. dependency', () => {
    beforeEach(() => {
      mockGetFileDotDependencies.mockReturnValue(new Set(['rhachet']));
      mockResolveRolesToPackages.mockResolvedValue([]);
    });

    when('execUpgrade is called with --self', () => {
      then('excludes rhachet from install', async () => {
        await execUpgrade({ self: true }, context);

        // should NOT call execNpmInstall at all
        expect(mockExecNpmInstall).not.toHaveBeenCalled();
      });
    });
  });

  given('mixed file:. and regular dependencies', () => {
    beforeEach(() => {
      mockGetFileDotDependencies.mockReturnValue(
        new Set(['rhachet-roles-ehmpathy']),
      );
      mockDiscoverLinkedRoles.mockReturnValue([
        { repo: 'ehmpathy', role: 'mechanic' },
        { repo: 'bhuild', role: 'behaver' },
      ]);
      mockResolveRolesToPackages.mockResolvedValue([
        'rhachet-roles-ehmpathy',
        'rhachet-roles-bhuild',
      ]);
    });

    when('execUpgrade is called with --roles *', () => {
      then('installs only non-file:. packages', async () => {
        await execUpgrade({ roleSpecs: ['*'] }, context);

        // should only include rhachet-roles-bhuild
        expect(mockExecNpmInstall).toHaveBeenCalledWith(
          { packages: ['rhachet-roles-bhuild'] },
          context,
        );
      });
    });
  });
});
