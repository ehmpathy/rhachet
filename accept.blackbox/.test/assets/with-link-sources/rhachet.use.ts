import type { RoleRegistry } from 'rhachet';

export const getRoleRegistries = (): RoleRegistry[] => [
  {
    slug: 'test-repo',
    readme: '# Test Repository\n\nThis is the test repo readme for acceptance tests.',
    roles: [
      {
        slug: 'tester',
        name: 'Tester',
        purpose: 'test role for acceptance tests',
        readme: '# Tester Role\n\nThis is the tester role readme for acceptance tests.',
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
