import { given, then, when } from 'test-fns';

import { ContextCli } from '@src/domain.objects/ContextCli';

import { resolveRolesToPackages } from './resolveRolesToPackages';

// mock getRegistriesByConfigImplicit
jest.mock('../config/getRegistriesByConfigImplicit', () => ({
  getRegistriesByConfigImplicit: jest.fn(),
}));

import { getRegistriesByConfigImplicit } from '../config/getRegistriesByConfigImplicit';

const mockGetRegistries = getRegistriesByConfigImplicit as jest.MockedFunction<
  typeof getRegistriesByConfigImplicit
>;

describe('resolveRolesToPackages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  given('empty roles array', () => {
    when('resolveRolesToPackages is called', () => {
      then('returns empty array without manifest lookup', async () => {
        const context = new ContextCli({ cwd: '/test' });
        const result = await resolveRolesToPackages({ roles: [] }, context);
        expect(result).toEqual([]);
        expect(mockGetRegistries).not.toHaveBeenCalled();
      });
    });
  });

  given('roles that match installed manifests', () => {
    beforeEach(() => {
      mockGetRegistries.mockResolvedValue({
        manifests: [
          {
            slug: 'ehmpathy',
            packageRoot: '/node_modules/rhachet-roles-ehmpathy',
          } as never,
          {
            slug: 'bhrain',
            packageRoot: '/node_modules/rhachet-roles-bhrain',
          } as never,
        ],
        errors: [],
      });
    });

    when('resolveRolesToPackages is called with single role', () => {
      then('returns the package name', async () => {
        const context = new ContextCli({ cwd: '/test' });
        const result = await resolveRolesToPackages(
          { roles: [{ repo: 'ehmpathy', role: 'mechanic' }] },
          context,
        );
        expect(result).toEqual(['rhachet-roles-ehmpathy']);
      });
    });

    when(
      'resolveRolesToPackages is called with multiple roles from same repo',
      () => {
        then('deduplicates to single package', async () => {
          const context = new ContextCli({ cwd: '/test' });
          const result = await resolveRolesToPackages(
            {
              roles: [
                { repo: 'ehmpathy', role: 'mechanic' },
                { repo: 'ehmpathy', role: 'tuner' },
              ],
            },
            context,
          );
          expect(result).toEqual(['rhachet-roles-ehmpathy']);
        });
      },
    );

    when(
      'resolveRolesToPackages is called with roles from different repos',
      () => {
        then('returns package name for each repo', async () => {
          const context = new ContextCli({ cwd: '/test' });
          const result = await resolveRolesToPackages(
            {
              roles: [
                { repo: 'ehmpathy', role: 'mechanic' },
                { repo: 'bhrain', role: 'reviewer' },
              ],
            },
            context,
          );
          expect(result).toContain('rhachet-roles-ehmpathy');
          expect(result).toContain('rhachet-roles-bhrain');
          expect(result).toHaveLength(2);
        });
      },
    );
  });

  given('role that does not match any installed manifest', () => {
    beforeEach(() => {
      mockGetRegistries.mockResolvedValue({
        manifests: [
          {
            slug: 'ehmpathy',
            packageRoot: '/node_modules/rhachet-roles-ehmpathy',
          } as never,
        ],
        errors: [],
      });
    });

    when('resolveRolesToPackages is called', () => {
      then('throws BadRequestError with suggestion', async () => {
        const context = new ContextCli({ cwd: '/test' });
        await expect(
          resolveRolesToPackages(
            { roles: [{ repo: 'nonexistent', role: 'mechanic' }] },
            context,
          ),
        ).rejects.toThrow('role package not installed');
      });
    });
  });
});
