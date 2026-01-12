import { given, then, when } from 'test-fns';

import { Role, RoleRegistry } from '@src/domain.objects';

import { resolveRoleSpecifiers } from './resolveRoleSpecifiers';

describe('resolveRoleSpecifiers', () => {
  // create test registries
  const mechanicRole = new Role({
    slug: 'mechanic',
    name: 'Mechanic',
    purpose: 'test role',
    readme: { uri: '/ehmpathy/mechanic/readme.md' },
    traits: [],
    briefs: { dirs: { uri: '/ehmpathy/mechanic/briefs' } },
    skills: { dirs: { uri: '/ehmpathy/mechanic/skills' }, refs: [] },
  });

  const behaverRole = new Role({
    slug: 'behaver',
    name: 'Behaver',
    purpose: 'test role',
    readme: { uri: '/bhuild/behaver/readme.md' },
    traits: [],
    briefs: { dirs: { uri: '/bhuild/behaver/briefs' } },
    skills: { dirs: { uri: '/bhuild/behaver/skills' }, refs: [] },
  });

  const reviewerRole = new Role({
    slug: 'reviewer',
    name: 'Reviewer',
    purpose: 'test role',
    readme: { uri: '/bhuild/reviewer/readme.md' },
    traits: [],
    briefs: { dirs: { uri: '/bhuild/reviewer/briefs' } },
    skills: { dirs: { uri: '/bhuild/reviewer/skills' }, refs: [] },
  });

  // also add mechanic to bhuild for ambiguity tests
  const mechanicRoleBhuild = new Role({
    slug: 'mechanic',
    name: 'Mechanic',
    purpose: 'bhuild mechanic',
    readme: { uri: '/bhuild/mechanic/readme.md' },
    traits: [],
    briefs: { dirs: { uri: '/bhuild/mechanic/briefs' } },
    skills: { dirs: { uri: '/bhuild/mechanic/skills' }, refs: [] },
  });

  const ehmpathyRegistry = new RoleRegistry({
    slug: 'ehmpathy',
    readme: { uri: '/ehmpathy/readme.md' },
    roles: [mechanicRole],
  });

  const bhuildRegistry = new RoleRegistry({
    slug: 'bhuild',
    readme: { uri: '/bhuild/readme.md' },
    roles: [behaverRole, reviewerRole],
  });

  const bhuildRegistryWithMechanic = new RoleRegistry({
    slug: 'bhuild',
    readme: { uri: '/bhuild/readme.md' },
    roles: [behaverRole, reviewerRole, mechanicRoleBhuild],
  });

  given('[case1] unqualified specifier with unique role', () => {
    const registries = [ehmpathyRegistry, bhuildRegistry];

    when('[t0] resolve "mechanic"', () => {
      then('returns resolved role from ehmpathy', () => {
        const result = resolveRoleSpecifiers({
          specifiers: ['mechanic'],
          registries,
        });
        expect(result.resolved).toHaveLength(1);
        expect(result.errors).toHaveLength(0);
        expect(result.resolved[0]?.role.slug).toEqual('mechanic');
        expect(result.resolved[0]?.registry.slug).toEqual('ehmpathy');
      });
    });

    when('[t1] resolve "behaver"', () => {
      then('returns resolved role from bhuild', () => {
        const result = resolveRoleSpecifiers({
          specifiers: ['behaver'],
          registries,
        });
        expect(result.resolved).toHaveLength(1);
        expect(result.errors).toHaveLength(0);
        expect(result.resolved[0]?.role.slug).toEqual('behaver');
        expect(result.resolved[0]?.registry.slug).toEqual('bhuild');
      });
    });
  });

  given('[case2] qualified specifier', () => {
    const registries = [ehmpathyRegistry, bhuildRegistry];

    when('[t0] resolve "ehmpathy/mechanic"', () => {
      then('returns resolved role from ehmpathy', () => {
        const result = resolveRoleSpecifiers({
          specifiers: ['ehmpathy/mechanic'],
          registries,
        });
        expect(result.resolved).toHaveLength(1);
        expect(result.errors).toHaveLength(0);
        expect(result.resolved[0]?.role.slug).toEqual('mechanic');
        expect(result.resolved[0]?.registry.slug).toEqual('ehmpathy');
      });
    });

    when('[t1] resolve "bhuild/behaver"', () => {
      then('returns resolved role from bhuild', () => {
        const result = resolveRoleSpecifiers({
          specifiers: ['bhuild/behaver'],
          registries,
        });
        expect(result.resolved).toHaveLength(1);
        expect(result.errors).toHaveLength(0);
        expect(result.resolved[0]?.role.slug).toEqual('behaver');
        expect(result.resolved[0]?.registry.slug).toEqual('bhuild');
      });
    });
  });

  given('[case3] multiple specifiers', () => {
    const registries = [ehmpathyRegistry, bhuildRegistry];

    when('[t0] resolve ["mechanic", "behaver"]', () => {
      then('returns both resolved roles', () => {
        const result = resolveRoleSpecifiers({
          specifiers: ['mechanic', 'behaver'],
          registries,
        });
        expect(result.resolved).toHaveLength(2);
        expect(result.errors).toHaveLength(0);
        expect(result.resolved.map((r) => r.role.slug)).toEqual([
          'mechanic',
          'behaver',
        ]);
      });
    });
  });

  given('[case4] role not found', () => {
    const registries = [ehmpathyRegistry, bhuildRegistry];

    when('[t0] resolve "nonexistent"', () => {
      then('returns error for that specifier', () => {
        const result = resolveRoleSpecifiers({
          specifiers: ['nonexistent'],
          registries,
        });
        expect(result.resolved).toHaveLength(0);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]?.specifier).toEqual('nonexistent');
        expect(result.errors[0]?.error.message).toContain('No repo has role');
      });
    });
  });

  given('[case5] registry not found for qualified specifier', () => {
    const registries = [ehmpathyRegistry, bhuildRegistry];

    when('[t0] resolve "unknown/mechanic"', () => {
      then('returns error for that specifier', () => {
        const result = resolveRoleSpecifiers({
          specifiers: ['unknown/mechanic'],
          registries,
        });
        expect(result.resolved).toHaveLength(0);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]?.specifier).toEqual('unknown/mechanic');
        expect(result.errors[0]?.error.message).toContain('not found');
      });
    });
  });

  given('[case6] role not found in specified registry', () => {
    const registries = [ehmpathyRegistry, bhuildRegistry];

    when('[t0] resolve "ehmpathy/behaver"', () => {
      then('returns error for that specifier', () => {
        const result = resolveRoleSpecifiers({
          specifiers: ['ehmpathy/behaver'],
          registries,
        });
        expect(result.resolved).toHaveLength(0);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]?.specifier).toEqual('ehmpathy/behaver');
        expect(result.errors[0]?.error.message).toContain(
          'not found in registry',
        );
      });
    });
  });

  given('[case7] ambiguous role (same slug in multiple registries)', () => {
    const registries = [ehmpathyRegistry, bhuildRegistryWithMechanic];

    when('[t0] resolve "mechanic"', () => {
      then('returns error about ambiguity', () => {
        const result = resolveRoleSpecifiers({
          specifiers: ['mechanic'],
          registries,
        });
        expect(result.resolved).toHaveLength(0);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]?.specifier).toEqual('mechanic');
        expect(result.errors[0]?.error.message).toContain('Multiple repos');
      });
    });

    when('[t1] resolve qualified "ehmpathy/mechanic"', () => {
      then('returns resolved role from ehmpathy', () => {
        const result = resolveRoleSpecifiers({
          specifiers: ['ehmpathy/mechanic'],
          registries,
        });
        expect(result.resolved).toHaveLength(1);
        expect(result.errors).toHaveLength(0);
        expect(result.resolved[0]?.role.slug).toEqual('mechanic');
        expect(result.resolved[0]?.registry.slug).toEqual('ehmpathy');
      });
    });

    when('[t2] resolve qualified "bhuild/mechanic"', () => {
      then('returns resolved role from bhuild', () => {
        const result = resolveRoleSpecifiers({
          specifiers: ['bhuild/mechanic'],
          registries,
        });
        expect(result.resolved).toHaveLength(1);
        expect(result.errors).toHaveLength(0);
        expect(result.resolved[0]?.role.slug).toEqual('mechanic');
        expect(result.resolved[0]?.registry.slug).toEqual('bhuild');
      });
    });
  });

  given('[case8] mixed valid and invalid specifiers', () => {
    const registries = [ehmpathyRegistry, bhuildRegistry];

    when('[t0] resolve ["mechanic", "nonexistent", "behaver"]', () => {
      then('returns resolved roles and errors separately', () => {
        const result = resolveRoleSpecifiers({
          specifiers: ['mechanic', 'nonexistent', 'behaver'],
          registries,
        });
        expect(result.resolved).toHaveLength(2);
        expect(result.errors).toHaveLength(1);
        expect(result.resolved.map((r) => r.role.slug)).toEqual([
          'mechanic',
          'behaver',
        ]);
        expect(result.errors[0]?.specifier).toEqual('nonexistent');
      });
    });
  });

  given('[case9] empty inputs', () => {
    when('[t0] resolve empty specifiers array', () => {
      then('returns empty resolved and errors arrays', () => {
        const result = resolveRoleSpecifiers({
          specifiers: [],
          registries: [ehmpathyRegistry],
        });
        expect(result.resolved).toHaveLength(0);
        expect(result.errors).toHaveLength(0);
      });
    });

    when('[t1] resolve with empty registries array', () => {
      then('returns error for each specifier', () => {
        const result = resolveRoleSpecifiers({
          specifiers: ['mechanic'],
          registries: [],
        });
        expect(result.resolved).toHaveLength(0);
        expect(result.errors).toHaveLength(1);
      });
    });
  });
});
