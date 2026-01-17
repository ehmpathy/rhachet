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
jest.mock('@src/domain.operations/init/initRolesFromPackages', () => ({
  initRolesFromPackages: jest.fn(),
}));

import { initRolesFromPackages } from '@src/domain.operations/init/initRolesFromPackages';

import { discoverLinkedRoles } from './discoverLinkedRoles';
import { execNpmInstall } from './execNpmInstall';
import { resolveRolesToPackages } from './resolveRolesToPackages';

const mockDiscoverLinkedRoles = discoverLinkedRoles as jest.MockedFunction<
  typeof discoverLinkedRoles
>;
const mockResolveRolesToPackages =
  resolveRolesToPackages as jest.MockedFunction<typeof resolveRolesToPackages>;
const mockExecNpmInstall = execNpmInstall as jest.MockedFunction<
  typeof execNpmInstall
>;
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
});
