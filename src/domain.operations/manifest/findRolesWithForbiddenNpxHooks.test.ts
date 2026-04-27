import { given, then, when } from 'test-fns';

import type { Role } from '@src/domain.objects/Role';
import type { RoleRegistry } from '@src/domain.objects/RoleRegistry';

import {
  findRolesWithForbiddenNpxHooks,
  getForbiddenNpxHint,
} from './findRolesWithForbiddenNpxHooks';

describe('findRolesWithForbiddenNpxHooks', () => {
  given('[case1] registry with no hooks', () => {
    when('[t0] checked for violations', () => {
      then('returns empty array', () => {
        const result = findRolesWithForbiddenNpxHooks({
          registry: {
            slug: 'test',
            roles: [{ slug: 'role1' }] as unknown as Role[],
          } as RoleRegistry,
        });
        expect(result).toEqual([]);
      });
    });
  });

  given('[case2] registry with valid hooks using direct path', () => {
    when('[t0] checked for violations', () => {
      then('returns empty array', () => {
        const result = findRolesWithForbiddenNpxHooks({
          registry: {
            slug: 'test',
            roles: [
              {
                slug: 'mechanic',
                hooks: {
                  onBrain: {
                    onBoot: [
                      {
                        command:
                          './node_modules/.bin/rhachet roles boot --role mechanic',
                        timeout: 'PT60S',
                      },
                    ],
                  },
                },
              },
            ] as unknown as Role[],
          } as RoleRegistry,
        });
        expect(result).toEqual([]);
      });
    });
  });

  given('[case3] registry with valid hooks using global rhachet', () => {
    when('[t0] checked for violations', () => {
      then('returns empty array', () => {
        const result = findRolesWithForbiddenNpxHooks({
          registry: {
            slug: 'test',
            roles: [
              {
                slug: 'mechanic',
                hooks: {
                  onBrain: {
                    onBoot: [
                      {
                        command: 'rhachet roles boot --role mechanic',
                        timeout: 'PT60S',
                      },
                    ],
                  },
                },
              },
            ] as unknown as Role[],
          } as RoleRegistry,
        });
        expect(result).toEqual([]);
      });
    });
  });

  given('[case4] registry with valid hooks using pnpm exec', () => {
    when('[t0] checked for violations', () => {
      then('returns empty array (pnpm exec is allowed)', () => {
        const result = findRolesWithForbiddenNpxHooks({
          registry: {
            slug: 'test',
            roles: [
              {
                slug: 'mechanic',
                hooks: {
                  onBrain: {
                    onBoot: [
                      {
                        command: 'pnpm exec rhachet roles boot --role mechanic',
                        timeout: 'PT60S',
                      },
                    ],
                  },
                },
              },
            ] as unknown as Role[],
          } as RoleRegistry,
        });
        expect(result).toEqual([]);
      });
    });
  });

  given('[case5] registry with valid hooks using yarn exec', () => {
    when('[t0] checked for violations', () => {
      then('returns empty array (yarn exec is allowed)', () => {
        const result = findRolesWithForbiddenNpxHooks({
          registry: {
            slug: 'test',
            roles: [
              {
                slug: 'mechanic',
                hooks: {
                  onBrain: {
                    onBoot: [
                      {
                        command: 'yarn exec rhachet roles boot --role mechanic',
                        timeout: 'PT60S',
                      },
                    ],
                  },
                },
              },
            ] as unknown as Role[],
          } as RoleRegistry,
        });
        expect(result).toEqual([]);
      });
    });
  });

  given('[case6] registry with forbidden npx rhachet hook', () => {
    when('[t0] checked for violations', () => {
      then('returns violation for that hook', () => {
        const result = findRolesWithForbiddenNpxHooks({
          registry: {
            slug: 'test',
            roles: [
              {
                slug: 'mechanic',
                hooks: {
                  onBrain: {
                    onBoot: [
                      {
                        command: 'npx rhachet roles boot --role mechanic',
                        timeout: 'PT120S',
                      },
                    ],
                  },
                },
              },
            ] as unknown as Role[],
          } as RoleRegistry,
        });
        expect(result).toEqual([
          {
            roleSlug: 'mechanic',
            hookType: 'onBoot',
            hookIndex: 0,
            command: 'npx rhachet roles boot --role mechanic',
          },
        ]);
      });
    });
  });

  given('[case7] registry with forbidden npx rhx hook', () => {
    when('[t0] checked for violations', () => {
      then('returns violation for that hook', () => {
        const result = findRolesWithForbiddenNpxHooks({
          registry: {
            slug: 'test',
            roles: [
              {
                slug: 'mechanic',
                hooks: {
                  onBrain: {
                    onTool: [
                      {
                        command: 'npx rhx some-skill',
                        timeout: 'PT60S',
                      },
                    ],
                  },
                },
              },
            ] as unknown as Role[],
          } as RoleRegistry,
        });
        expect(result).toEqual([
          {
            roleSlug: 'mechanic',
            hookType: 'onTool',
            hookIndex: 0,
            command: 'npx rhx some-skill',
          },
        ]);
      });
    });
  });

  given('[case8] registry with bunx hooks', () => {
    when('[t0] checked for violations', () => {
      then('returns empty array (bunx is allowed)', () => {
        const result = findRolesWithForbiddenNpxHooks({
          registry: {
            slug: 'test',
            roles: [
              {
                slug: 'mechanic',
                hooks: {
                  onBrain: {
                    onStop: [
                      {
                        command: 'bunx rhachet roles cleanup --role mechanic',
                        timeout: 'PT60S',
                      },
                    ],
                  },
                },
              },
            ] as unknown as Role[],
          } as RoleRegistry,
        });
        expect(result).toEqual([]);
      });
    });
  });

  given('[case9] registry with npx --yes rhachet', () => {
    when('[t0] checked for violations', () => {
      then('returns violation (flags between npx and rhachet)', () => {
        const result = findRolesWithForbiddenNpxHooks({
          registry: {
            slug: 'test',
            roles: [
              {
                slug: 'mechanic',
                hooks: {
                  onBrain: {
                    onBoot: [
                      {
                        command: 'npx --yes rhachet roles boot --role mechanic',
                        timeout: 'PT60S',
                      },
                    ],
                  },
                },
              },
            ] as unknown as Role[],
          } as RoleRegistry,
        });
        expect(result).toHaveLength(1);
        expect(result[0]?.command).toContain('npx --yes rhachet');
      });
    });
  });

  given('[case10] multiple violations across roles and hook types', () => {
    when('[t0] checked for violations', () => {
      then('returns all violations', () => {
        const result = findRolesWithForbiddenNpxHooks({
          registry: {
            slug: 'test',
            roles: [
              {
                slug: 'mechanic',
                hooks: {
                  onBrain: {
                    onBoot: [
                      {
                        command: 'npx rhachet roles boot --role mechanic',
                        timeout: 'PT120S',
                      },
                    ],
                    onTool: [
                      {
                        command: './node_modules/.bin/rhachet run --skill test', // valid
                        timeout: 'PT60S',
                      },
                      {
                        command: 'bunx rhx another-skill', // valid (bunx allowed)
                        timeout: 'PT60S',
                      },
                    ],
                  },
                },
              },
              {
                slug: 'architect',
                hooks: {
                  onBrain: {
                    onBoot: [
                      {
                        command: 'npx rhx roles boot --role architect',
                        timeout: 'PT120S',
                      },
                    ],
                  },
                },
              },
            ] as unknown as Role[],
          } as RoleRegistry,
        });
        expect(result).toHaveLength(2);
        expect(result.map((v) => v.roleSlug)).toEqual([
          'mechanic',
          'architect',
        ]);
      });
    });
  });
});

describe('getForbiddenNpxHint', () => {
  const TEST_CASES = [
    {
      description: 'replaces npx rhachet with direct path',
      given: 'npx rhachet roles boot --role mechanic',
      expect: './node_modules/.bin/rhachet roles boot --role mechanic',
    },
    {
      description: 'replaces npx rhx with direct path (rhachet)',
      given: 'npx rhx roles boot --role mechanic',
      expect: './node_modules/.bin/rhachet roles boot --role mechanic',
    },
    {
      description: 'handles npx --yes rhachet',
      given: 'npx --yes rhachet roles boot --role mechanic',
      expect: './node_modules/.bin/rhachet roles boot --role mechanic',
    },
  ];

  TEST_CASES.forEach((tc) =>
    it(tc.description, () => {
      expect(getForbiddenNpxHint(tc.given)).toEqual(tc.expect);
    }),
  );
});
