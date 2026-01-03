import type { RoleRegistry } from 'rhachet';

export const getRoleRegistries = (): RoleRegistry[] => [
  {
    slug: '.this',
    readme: { uri: '.agent/repo=.this/readme.md' },
    roles: [
      {
        slug: 'any',
        name: 'Any',
        purpose: 'applies to any agent',
        readme: { uri: '.agent/repo=.this/role=any/readme.md' },
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
