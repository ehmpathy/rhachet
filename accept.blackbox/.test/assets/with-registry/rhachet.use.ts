import type { RoleRegistry } from 'rhachet';

export const getRoleRegistries = (): RoleRegistry[] => [
  {
    slug: '.this',
    readme: 'test registry',
    roles: [
      {
        slug: 'any',
        name: 'Any',
        purpose: 'applies to any agent',
        readme: '# any role',
        traits: [],
        skills: {
          dirs: { uri: '.agent/repo=.this/role=any/skills' },
          refs: [],
        },
        briefs: {
          dirs: { uri: '.agent/repo=.this/role=any/briefs' },
        },
      },
    ],
  },
];
export const getBrainRepls = () => [];
