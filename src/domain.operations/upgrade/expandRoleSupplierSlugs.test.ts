import { given, then, when } from 'test-fns';

import { ContextCli } from '@src/domain.objects/ContextCli';

import { expandRoleSupplierSlugs } from './expandRoleSupplierSlugs';

// mock discoverRolePackages
jest.mock('@src/domain.operations/init/discoverRolePackages', () => ({
  discoverRolePackages: jest.fn(),
}));

// mock discoverLinkedRoles
jest.mock('./discoverLinkedRoles', () => ({
  discoverLinkedRoles: jest.fn(),
}));

import { discoverRolePackages } from '@src/domain.operations/init/discoverRolePackages';

import { discoverLinkedRoles } from './discoverLinkedRoles';

const mockDiscoverRolePackages = discoverRolePackages as jest.MockedFunction<
  typeof discoverRolePackages
>;
const mockDiscoverLinkedRoles = discoverLinkedRoles as jest.MockedFunction<
  typeof discoverLinkedRoles
>;

describe('expandRoleSupplierSlugs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  given('[case1] empty specs array', () => {
    when('[t0] expandRoleSupplierSlugs is called', () => {
      then('returns empty results', async () => {
        mockDiscoverLinkedRoles.mockReturnValue([]);
        const context = new ContextCli({ cwd: '/test', gitroot: '/test' });
        const result = await expandRoleSupplierSlugs({ specs: [] }, context);
        expect(result).toEqual({
          packages: [],
          linkedRoles: [],
          slugs: [],
        });
      });
    });
  });

  given('[case2] global wildcard *', () => {
    beforeEach(() => {
      mockDiscoverRolePackages.mockResolvedValue([
        'rhachet-roles-ehmpathy',
        'rhachet-roles-bhuild',
      ]);
      mockDiscoverLinkedRoles.mockReturnValue([
        { repo: 'ehmpathy', role: 'mechanic' },
        { repo: 'ehmpathy', role: 'designer' },
        { repo: 'bhuild', role: 'behaver' },
      ]);
    });

    when('[t0] spec is *', () => {
      then('returns all installed packages', async () => {
        const context = new ContextCli({ cwd: '/test', gitroot: '/test' });
        const result = await expandRoleSupplierSlugs({ specs: ['*'] }, context);
        expect(result.packages).toContain('rhachet-roles-ehmpathy');
        expect(result.packages).toContain('rhachet-roles-bhuild');
        expect(result.packages).toHaveLength(2);
      });

      then('returns all linked roles', async () => {
        const context = new ContextCli({ cwd: '/test', gitroot: '/test' });
        const result = await expandRoleSupplierSlugs({ specs: ['*'] }, context);
        expect(result.linkedRoles).toContainEqual({
          repo: 'ehmpathy',
          role: 'mechanic',
        });
        expect(result.linkedRoles).toContainEqual({
          repo: 'ehmpathy',
          role: 'designer',
        });
        expect(result.linkedRoles).toContainEqual({
          repo: 'bhuild',
          role: 'behaver',
        });
        expect(result.linkedRoles).toHaveLength(3);
      });

      then('returns slugs for all packages', async () => {
        const context = new ContextCli({ cwd: '/test', gitroot: '/test' });
        const result = await expandRoleSupplierSlugs({ specs: ['*'] }, context);
        expect(result.slugs).toContain('ehmpathy/*');
        expect(result.slugs).toContain('bhuild/*');
        expect(result.slugs).toHaveLength(2);
      });
    });
  });

  given('[case3] repo wildcard ehmpathy/*', () => {
    beforeEach(() => {
      mockDiscoverLinkedRoles.mockReturnValue([
        { repo: 'ehmpathy', role: 'mechanic' },
        { repo: 'ehmpathy', role: 'designer' },
        { repo: 'bhuild', role: 'behaver' },
      ]);
    });

    when('[t0] spec is ehmpathy/*', () => {
      then('returns ehmpathy package', async () => {
        const context = new ContextCli({ cwd: '/test', gitroot: '/test' });
        const result = await expandRoleSupplierSlugs(
          { specs: ['ehmpathy/*'] },
          context,
        );
        expect(result.packages).toEqual(['rhachet-roles-ehmpathy']);
      });

      then('returns only ehmpathy linked roles', async () => {
        const context = new ContextCli({ cwd: '/test', gitroot: '/test' });
        const result = await expandRoleSupplierSlugs(
          { specs: ['ehmpathy/*'] },
          context,
        );
        expect(result.linkedRoles).toContainEqual({
          repo: 'ehmpathy',
          role: 'mechanic',
        });
        expect(result.linkedRoles).toContainEqual({
          repo: 'ehmpathy',
          role: 'designer',
        });
        expect(result.linkedRoles).toHaveLength(2);
      });

      then('returns ehmpathy/* slug', async () => {
        const context = new ContextCli({ cwd: '/test', gitroot: '/test' });
        const result = await expandRoleSupplierSlugs(
          { specs: ['ehmpathy/*'] },
          context,
        );
        expect(result.slugs).toEqual(['ehmpathy/*']);
      });
    });
  });

  given('[case4] explicit role ehmpathy/mechanic', () => {
    beforeEach(() => {
      mockDiscoverLinkedRoles.mockReturnValue([
        { repo: 'ehmpathy', role: 'mechanic' },
        { repo: 'ehmpathy', role: 'designer' },
      ]);
    });

    when('[t0] spec is ehmpathy/mechanic and role is linked', () => {
      then('returns ehmpathy package', async () => {
        const context = new ContextCli({ cwd: '/test', gitroot: '/test' });
        const result = await expandRoleSupplierSlugs(
          { specs: ['ehmpathy/mechanic'] },
          context,
        );
        expect(result.packages).toEqual(['rhachet-roles-ehmpathy']);
      });

      then('returns only mechanic linked role', async () => {
        const context = new ContextCli({ cwd: '/test', gitroot: '/test' });
        const result = await expandRoleSupplierSlugs(
          { specs: ['ehmpathy/mechanic'] },
          context,
        );
        expect(result.linkedRoles).toEqual([
          { repo: 'ehmpathy', role: 'mechanic' },
        ]);
      });

      then('returns ehmpathy/mechanic slug', async () => {
        const context = new ContextCli({ cwd: '/test', gitroot: '/test' });
        const result = await expandRoleSupplierSlugs(
          { specs: ['ehmpathy/mechanic'] },
          context,
        );
        expect(result.slugs).toEqual(['ehmpathy/mechanic']);
      });
    });
  });

  given('[case5] explicit role that is not linked', () => {
    beforeEach(() => {
      mockDiscoverLinkedRoles.mockReturnValue([
        { repo: 'ehmpathy', role: 'mechanic' },
      ]);
    });

    when('[t0] spec is ehmpathy/designer but only mechanic is linked', () => {
      then('returns ehmpathy package (for upgrade)', async () => {
        const context = new ContextCli({ cwd: '/test', gitroot: '/test' });
        const result = await expandRoleSupplierSlugs(
          { specs: ['ehmpathy/designer'] },
          context,
        );
        expect(result.packages).toEqual(['rhachet-roles-ehmpathy']);
      });

      then('returns empty linked roles (designer not linked)', async () => {
        const context = new ContextCli({ cwd: '/test', gitroot: '/test' });
        const result = await expandRoleSupplierSlugs(
          { specs: ['ehmpathy/designer'] },
          context,
        );
        expect(result.linkedRoles).toEqual([]);
      });

      then('returns slug anyway (for upgrade)', async () => {
        const context = new ContextCli({ cwd: '/test', gitroot: '/test' });
        const result = await expandRoleSupplierSlugs(
          { specs: ['ehmpathy/designer'] },
          context,
        );
        expect(result.slugs).toEqual(['ehmpathy/designer']);
      });
    });
  });

  given('[case6] full package name with role', () => {
    beforeEach(() => {
      mockDiscoverLinkedRoles.mockReturnValue([
        { repo: 'ehmpathy', role: 'mechanic' },
      ]);
    });

    when('[t0] spec is rhachet-roles-ehmpathy/mechanic', () => {
      then('extracts repo correctly', async () => {
        const context = new ContextCli({ cwd: '/test', gitroot: '/test' });
        const result = await expandRoleSupplierSlugs(
          { specs: ['rhachet-roles-ehmpathy/mechanic'] },
          context,
        );
        expect(result.packages).toEqual(['rhachet-roles-ehmpathy']);
        expect(result.slugs).toEqual(['ehmpathy/mechanic']);
        expect(result.linkedRoles).toEqual([
          { repo: 'ehmpathy', role: 'mechanic' },
        ]);
      });
    });
  });

  given('[case7] multiple specs with deduplication', () => {
    beforeEach(() => {
      mockDiscoverLinkedRoles.mockReturnValue([
        { repo: 'ehmpathy', role: 'mechanic' },
        { repo: 'ehmpathy', role: 'designer' },
      ]);
    });

    when('[t0] specs include both wildcard and explicit role', () => {
      then('deduplicates packages', async () => {
        const context = new ContextCli({ cwd: '/test', gitroot: '/test' });
        const result = await expandRoleSupplierSlugs(
          { specs: ['ehmpathy/*', 'ehmpathy/mechanic'] },
          context,
        );
        expect(result.packages).toEqual(['rhachet-roles-ehmpathy']);
      });

      then('deduplicates linked roles', async () => {
        const context = new ContextCli({ cwd: '/test', gitroot: '/test' });
        const result = await expandRoleSupplierSlugs(
          { specs: ['ehmpathy/*', 'ehmpathy/mechanic'] },
          context,
        );
        expect(result.linkedRoles).toHaveLength(2);
      });
    });
  });

  given('[case8] just repo name (no slash)', () => {
    beforeEach(() => {
      mockDiscoverLinkedRoles.mockReturnValue([
        { repo: 'ehmpathy', role: 'mechanic' },
      ]);
    });

    when('[t0] spec is just "ehmpathy"', () => {
      then('treats as repo/* wildcard', async () => {
        const context = new ContextCli({ cwd: '/test', gitroot: '/test' });
        const result = await expandRoleSupplierSlugs(
          { specs: ['ehmpathy'] },
          context,
        );
        expect(result.packages).toEqual(['rhachet-roles-ehmpathy']);
        expect(result.slugs).toEqual(['ehmpathy/*']);
        expect(result.linkedRoles).toEqual([
          { repo: 'ehmpathy', role: 'mechanic' },
        ]);
      });
    });
  });
});
