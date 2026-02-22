import type { RoleRegistry } from 'rhachet';

export const getRoleRegistries = (): RoleRegistry[] => [
  {
    slug: 'test-repo',
    readme: '# Test Repository\n\nTest repo with init scripts for acceptance tests.',
    roles: [
      {
        slug: 'tester',
        name: 'Tester',
        purpose: 'test role with init scripts',
        readme: '# Tester Role\n\nRole with init scripts for testing pipe input.',
        traits: [],
        skills: {
          dirs: [],
          refs: [],
        },
        briefs: {
          dirs: [],
        },
        inits: {
          dirs: { uri: 'src/domain.roles/tester/inits' },
        },
      },
    ],
  },
];
export const getBrainRepls = () => [];
