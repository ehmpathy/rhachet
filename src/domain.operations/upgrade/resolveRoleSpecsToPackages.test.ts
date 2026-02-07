import { given, then, when } from 'test-fns';

import { ContextCli } from '@src/domain.objects/ContextCli';

import { resolveRoleSpecsToPackages } from './resolveRoleSpecsToPackages';

// mock discoverRolePackages
jest.mock('@src/domain.operations/init/discoverRolePackages', () => ({
  discoverRolePackages: jest.fn(),
}));

import { discoverRolePackages } from '@src/domain.operations/init/discoverRolePackages';

const mockDiscoverRolePackages = discoverRolePackages as jest.MockedFunction<
  typeof discoverRolePackages
>;

describe('resolveRoleSpecsToPackages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  given('[case1] empty specs array', () => {
    when('[t0] resolveRoleSpecsToPackages is called', () => {
      then('returns empty array without discovery', async () => {
        const context = new ContextCli({ cwd: '/test', gitroot: '/test' });
        const result = await resolveRoleSpecsToPackages({ specs: [] }, context);
        expect(result).toEqual([]);
        expect(mockDiscoverRolePackages).not.toHaveBeenCalled();
      });
    });
  });

  given('[case2] wildcard spec with installed role packages', () => {
    beforeEach(() => {
      mockDiscoverRolePackages.mockResolvedValue([
        'rhachet-roles-ehmpathy',
        'rhachet-roles-bhuild',
      ]);
    });

    when('[t0] resolveRoleSpecsToPackages is called with *', () => {
      then('expands via discovery and returns all role packages', async () => {
        const context = new ContextCli({ cwd: '/test', gitroot: '/test' });
        const result = await resolveRoleSpecsToPackages(
          { specs: ['*'] },
          context,
        );
        expect(result).toContain('rhachet-roles-ehmpathy');
        expect(result).toContain('rhachet-roles-bhuild');
        expect(result).toHaveLength(2);
      });
    });
  });

  given('[case3] explicit slug spec', () => {
    beforeEach(() => {
      mockDiscoverRolePackages.mockResolvedValue(['rhachet-roles-ehmpathy']);
    });

    when('[t0] resolveRoleSpecsToPackages is called with slug', () => {
      then('resolves slug to full package name', async () => {
        const context = new ContextCli({ cwd: '/test', gitroot: '/test' });
        const result = await resolveRoleSpecsToPackages(
          { specs: ['ehmpathy'] },
          context,
        );
        expect(result).toEqual(['rhachet-roles-ehmpathy']);
      });
    });
  });

  given('[case4] full package name spec', () => {
    beforeEach(() => {
      mockDiscoverRolePackages.mockResolvedValue(['rhachet-roles-ehmpathy']);
    });

    when(
      '[t0] resolveRoleSpecsToPackages is called with full package name',
      () => {
        then('passes through unchanged', async () => {
          const context = new ContextCli({ cwd: '/test', gitroot: '/test' });
          const result = await resolveRoleSpecsToPackages(
            { specs: ['rhachet-roles-ehmpathy'] },
            context,
          );
          expect(result).toEqual(['rhachet-roles-ehmpathy']);
        });
      },
    );
  });

  given('[case5] role package not installed', () => {
    beforeEach(() => {
      mockDiscoverRolePackages.mockResolvedValue(['rhachet-roles-ehmpathy']);
    });

    when(
      '[t0] resolveRoleSpecsToPackages is called with absent package',
      () => {
        then('throws BadRequestError with suggestion', async () => {
          const context = new ContextCli({ cwd: '/test', gitroot: '/test' });
          await expect(
            resolveRoleSpecsToPackages({ specs: ['nonexistent'] }, context),
          ).rejects.toThrow('role package not installed');
        });
      },
    );
  });

  given('[case6] duplicate specs', () => {
    beforeEach(() => {
      mockDiscoverRolePackages.mockResolvedValue(['rhachet-roles-ehmpathy']);
    });

    when('[t0] resolveRoleSpecsToPackages is called with duplicates', () => {
      then('deduplicates packages', async () => {
        const context = new ContextCli({ cwd: '/test', gitroot: '/test' });
        const result = await resolveRoleSpecsToPackages(
          { specs: ['ehmpathy', 'ehmpathy', 'rhachet-roles-ehmpathy'] },
          context,
        );
        expect(result).toEqual(['rhachet-roles-ehmpathy']);
      });
    });
  });

  given('[case7] role specifier with repo/role format', () => {
    beforeEach(() => {
      mockDiscoverRolePackages.mockResolvedValue(['rhachet-roles-ehmpathy']);
    });

    when('[t0] resolveRoleSpecsToPackages is called with repo/role', () => {
      then('extracts repo and resolves to package name', async () => {
        const context = new ContextCli({ cwd: '/test', gitroot: '/test' });
        const result = await resolveRoleSpecsToPackages(
          { specs: ['ehmpathy/mechanic'] },
          context,
        );
        expect(result).toEqual(['rhachet-roles-ehmpathy']);
      });
    });

    when(
      '[t1] resolveRoleSpecsToPackages is called with full package/role',
      () => {
        then('extracts repo and resolves to package name', async () => {
          const context = new ContextCli({ cwd: '/test', gitroot: '/test' });
          const result = await resolveRoleSpecsToPackages(
            { specs: ['rhachet-roles-ehmpathy/mechanic'] },
            context,
          );
          expect(result).toEqual(['rhachet-roles-ehmpathy']);
        });
      },
    );
  });
});
