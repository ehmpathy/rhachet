import { given, then, when } from 'test-fns';

import { asRoleSupplierExpansion } from './asRoleSupplierExpansion';

const ROLES_LINKED = [
  { repo: 'ehmpathy', role: 'mechanic' },
  { repo: 'ehmpathy', role: 'designer' },
  { repo: 'bhuild', role: 'behaver' },
];

const PACKAGES_INSTALLED = ['rhachet-roles-ehmpathy', 'rhachet-roles-bhuild'];

const TEST_CASES = [
  {
    description: '[case1] empty specs',
    given: { specs: [], rolesLinked: ROLES_LINKED },
    expect: { packages: [], linkedRoles: [], slugs: [] },
  },
  {
    description: '[case2] global wildcard *',
    given: { specs: ['*'], rolesLinked: ROLES_LINKED },
    expect: {
      packages: ['rhachet-roles-ehmpathy', 'rhachet-roles-bhuild'],
      linkedRoles: ROLES_LINKED,
      slugs: ['ehmpathy/*', 'bhuild/*'],
    },
  },
  {
    description: '[case3] repo wildcard ehmpathy/*',
    given: { specs: ['ehmpathy/*'], rolesLinked: ROLES_LINKED },
    expect: {
      packages: ['rhachet-roles-ehmpathy'],
      linkedRoles: [
        { repo: 'ehmpathy', role: 'mechanic' },
        { repo: 'ehmpathy', role: 'designer' },
      ],
      slugs: ['ehmpathy/*'],
    },
  },
  {
    description: '[case4] explicit role, linked',
    given: { specs: ['ehmpathy/mechanic'], rolesLinked: ROLES_LINKED },
    expect: {
      packages: ['rhachet-roles-ehmpathy'],
      linkedRoles: [{ repo: 'ehmpathy', role: 'mechanic' }],
      slugs: ['ehmpathy/mechanic'],
    },
  },
  {
    description:
      '[case5] explicit role, not linked: the package still upgrades',
    given: {
      specs: ['ehmpathy/designer'],
      rolesLinked: [{ repo: 'ehmpathy', role: 'mechanic' }],
    },
    expect: {
      packages: ['rhachet-roles-ehmpathy'],
      linkedRoles: [],
      slugs: ['ehmpathy/designer'],
    },
  },
  {
    description: '[case6] full package name with role',
    given: {
      specs: ['rhachet-roles-ehmpathy/mechanic'],
      rolesLinked: ROLES_LINKED,
    },
    expect: {
      packages: ['rhachet-roles-ehmpathy'],
      linkedRoles: [{ repo: 'ehmpathy', role: 'mechanic' }],
      slugs: ['ehmpathy/mechanic'],
    },
  },
  {
    description: '[case7] wildcard and explicit role overlap, deduplicated',
    given: {
      specs: ['ehmpathy/*', 'ehmpathy/mechanic'],
      rolesLinked: ROLES_LINKED,
    },
    expect: {
      packages: ['rhachet-roles-ehmpathy'],
      linkedRoles: [
        { repo: 'ehmpathy', role: 'mechanic' },
        { repo: 'ehmpathy', role: 'designer' },
      ],
      slugs: ['ehmpathy/*', 'ehmpathy/mechanic'],
    },
  },
  {
    description: '[case8] bare repo name reads as repo/*',
    given: { specs: ['ehmpathy'], rolesLinked: ROLES_LINKED },
    expect: {
      packages: ['rhachet-roles-ehmpathy'],
      linkedRoles: [
        { repo: 'ehmpathy', role: 'mechanic' },
        { repo: 'ehmpathy', role: 'designer' },
      ],
      slugs: ['ehmpathy/*'],
    },
  },
];

describe('asRoleSupplierExpansion', () => {
  TEST_CASES.map((thisCase) =>
    given(thisCase.description, () => {
      when('[t0] the specs are expanded', () => {
        then('the packages, linked roles, and slugs are as expected', () => {
          const result = asRoleSupplierExpansion({
            specs: thisCase.given.specs,
            packagesInstalled: PACKAGES_INSTALLED,
            rolesLinked: thisCase.given.rolesLinked,
          });
          expect(result).toEqual(thisCase.expect);
        });
      });
    }),
  );
});
