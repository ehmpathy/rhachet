import { RoleManifest } from '@src/domain.objects/RoleManifest';
import { RoleRegistryManifest } from '@src/domain.objects/RoleRegistryManifest';

import { asRoleSpecifierUncarried } from './asRoleSpecifierUncarried';

const asManifest = (input: {
  slug: string;
  roles: string[];
}): RoleRegistryManifest =>
  new RoleRegistryManifest({
    slug: input.slug,
    readme: { uri: 'readme.md' },
    roles: input.roles.map(
      (role) =>
        new RoleManifest({
          slug: role,
          readme: { uri: `${role}/readme.md` },
          briefs: { dirs: { uri: `${role}/briefs` } },
          skills: { dirs: { uri: `${role}/skills` } },
        }),
    ),
  });

const MANIFESTS = [
  asManifest({ slug: 'ehmpathy', roles: ['mechanic', 'architect'] }),
  asManifest({ slug: 'bhrain', roles: ['driver'] }),
];

const CASES = [
  {
    description: 'every role carried → null',
    given: ['ehmpathy/mechanic', 'bhrain/driver'],
    expect: null,
  },
  {
    description: 'a typo in the role slug → that specifier',
    given: ['ehmpathy/mechanic', 'ehmpathy/mechnaic'],
    expect: 'ehmpathy/mechnaic',
  },
  {
    description: 'a role under the wrong repo → that specifier',
    given: ['bhrain/mechanic'],
    expect: 'bhrain/mechanic',
  },
  {
    description: 'a repo with no installed package → that specifier',
    given: ['ahbode/scout'],
    expect: 'ahbode/scout',
  },
];

describe('asRoleSpecifierUncarried', () => {
  CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(
        asRoleSpecifierUncarried({
          specifiers: thisCase.given,
          manifests: MANIFESTS,
        }),
      ).toEqual(thisCase.expect);
    }),
  );
});
