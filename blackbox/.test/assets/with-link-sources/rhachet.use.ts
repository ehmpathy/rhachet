import type { RoleRegistry } from 'rhachet';

export const getRoleRegistries = (): RoleRegistry[] => [
  {
    slug: 'test-repo',
    readme: { uri: '.source/repo-readme.md' },
    roles: [
      {
        slug: 'tester',
        name: 'Tester',
        purpose: 'test role for acceptance tests',
        readme: { uri: '.source/role-readme.md' },
        traits: [],
        skills: {
          dirs: { uri: '.source/skills' },
          refs: [],
        },
        briefs: {
          dirs: { uri: '.source/briefs' },
        },
      },
    ],
  },
];
export const getBrainRepls = () => [];
