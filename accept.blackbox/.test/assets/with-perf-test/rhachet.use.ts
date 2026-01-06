import type { RoleRegistry } from 'rhachet';

export const getRoleRegistries = (): RoleRegistry[] => [
  {
    slug: 'perf-repo',
    readme: { uri: 'src/domain.roles/readme.md' },
    roles: [
      {
        slug: 'perf-role',
        name: 'Perf Role',
        purpose: 'role for performance acceptance tests',
        readme: { uri: 'src/domain.roles/perf-role/readme.md' },
        traits: [],
        skills: {
          dirs: { uri: 'src/domain.roles/perf-role/skills' },
          refs: [],
        },
        briefs: {
          dirs: { uri: 'src/domain.roles/perf-role/briefs' },
        },
        inits: {
          dirs: { uri: 'src/domain.roles/perf-role/inits' },
        },
      },
    ],
  },
];
export const getBrainRepls = () => [];
