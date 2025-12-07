import { given, then, when } from 'test-fns';

import { Role } from '../../domain/objects/Role';
import { RoleRegistry } from '../../domain/objects/RoleRegistry';
import { inferRepoByRole } from './inferRepoByRole';

describe('inferRepoByRole', () => {
  // Helper to create a minimal role
  const createRole = (slug: string): Role =>
    new Role({
      slug,
      name: slug,
      purpose: `Test ${slug} role`,
      readme: `# ${slug}`,
      traits: [],
      skills: { dirs: [], refs: [] },
      briefs: { dirs: [] },
    });

  // Helper to create a registry with roles
  const createRegistry = (slug: string, roleSlugs: string[]): RoleRegistry =>
    new RoleRegistry({
      slug,
      readme: `# ${slug}`,
      roles: roleSlugs.map(createRole),
    });

  given('exactly one registry has the role', () => {
    const registries = [
      createRegistry('ehmpathy', ['mechanic', 'designer']),
      createRegistry('acme', ['engineer']),
    ];

    when('inferring repo by role', () => {
      then('it returns the registry with that role', () => {
        const result = inferRepoByRole({
          registries,
          roleSlug: 'mechanic',
        });
        expect(result.slug).toBe('ehmpathy');
      });
    });
  });

  given('multiple registries have the same role', () => {
    const registries = [
      createRegistry('ehmpathy', ['mechanic']),
      createRegistry('acme', ['mechanic']),
    ];

    when('inferring repo by role', () => {
      then('it throws an error listing the ambiguous repos', () => {
        expect(() =>
          inferRepoByRole({
            registries,
            roleSlug: 'mechanic',
          }),
        ).toThrow(/Multiple repos have role "mechanic"/);
      });

      then('the error lists both repo slugs', () => {
        expect(() =>
          inferRepoByRole({
            registries,
            roleSlug: 'mechanic',
          }),
        ).toThrow(/ehmpathy/);

        expect(() =>
          inferRepoByRole({
            registries,
            roleSlug: 'mechanic',
          }),
        ).toThrow(/acme/);
      });
    });
  });

  given('no registries have the role', () => {
    const registries = [
      createRegistry('ehmpathy', ['designer']),
      createRegistry('acme', ['engineer']),
    ];

    when('inferring repo by role', () => {
      then('it throws an error about role not found', () => {
        expect(() =>
          inferRepoByRole({
            registries,
            roleSlug: 'mechanic',
          }),
        ).toThrow(/No repo has role "mechanic"/);
      });
    });
  });

  given('empty registries array', () => {
    when('inferring repo by role', () => {
      then('it throws an error about role not found', () => {
        expect(() =>
          inferRepoByRole({
            registries: [],
            roleSlug: 'mechanic',
          }),
        ).toThrow(/No repo has role "mechanic"/);
      });
    });
  });
});
