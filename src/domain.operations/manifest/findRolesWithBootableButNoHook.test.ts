import { given, then, when } from 'test-fns';

import {
  Role,
  RoleHookOnBrain,
  RoleHooks,
  RoleRegistry,
} from '@src/domain.objects';

import { findRolesWithBootableButNoHook } from './findRolesWithBootableButNoHook';

describe('findRolesWithBootableButNoHook', () => {
  /**
   * .what = creates a test role with configurable hooks
   * .why = reduces boilerplate in test setup
   */
  const createTestRole = (input: { slug: string; hooks?: RoleHooks }): Role => {
    return new Role({
      slug: input.slug,
      name: input.slug,
      purpose: 'test role',
      readme: { uri: `/test/${input.slug}/readme.md` },
      traits: [],
      briefs: { dirs: { uri: `/test/${input.slug}/briefs` } },
      skills: {
        dirs: { uri: `/test/${input.slug}/skills` },
        refs: [],
      },
      hooks: input.hooks,
    });
  };

  /**
   * .what = creates a boot hook with default timeout
   * .why = reduces boilerplate for hook creation
   */
  const createBootHook = (command: string): RoleHookOnBrain => {
    return new RoleHookOnBrain({
      command,
      timeout: 'PT60S',
    });
  };

  /**
   * .what = creates a test registry with roles
   * .why = reduces boilerplate in test setup
   */
  const createTestRegistry = (roles: Role[]): RoleRegistry => {
    return new RoleRegistry({
      slug: 'test-registry',
      readme: { uri: '/test/readme.md' },
      roles,
    });
  };

  given('[case1] all roles valid with correct boot command', () => {
    when('[t0] find is invoked', () => {
      then('returns empty array', () => {
        const role = createTestRole({
          slug: 'designer',
          hooks: new RoleHooks({
            onBrain: {
              onBoot: [
                createBootHook('npx rhachet roles boot --role designer'),
              ],
            },
          }),
        });
        const registry = createTestRegistry([role]);
        const result = findRolesWithBootableButNoHook({ registry });
        expect(result).toEqual([]);
      });
    });
  });

  given('[case2] role with no hooks defined', () => {
    when('[t0] find is invoked', () => {
      then('returns violation with no-hook-declared', () => {
        const role = createTestRole({
          slug: 'designer',
          hooks: undefined,
        });
        const registry = createTestRegistry([role]);
        const result = findRolesWithBootableButNoHook({ registry });
        expect(result).toEqual([
          {
            roleSlug: 'designer',
            hasBriefsDirs: true,
            hasSkillsDirs: true,
            reason: 'no-hook-declared',
          },
        ]);
      });
    });
  });

  given('[case3] role with hooks but no onBrain', () => {
    when('[t0] find is invoked', () => {
      then('returns violation with no-hook-declared', () => {
        const role = createTestRole({
          slug: 'mechanic',
          hooks: new RoleHooks({}),
        });
        const registry = createTestRegistry([role]);
        const result = findRolesWithBootableButNoHook({ registry });
        expect(result).toEqual([
          {
            roleSlug: 'mechanic',
            hasBriefsDirs: true,
            hasSkillsDirs: true,
            reason: 'no-hook-declared',
          },
        ]);
      });
    });
  });

  given('[case4] role with onBrain but no onBoot', () => {
    when('[t0] find is invoked', () => {
      then('returns violation with no-hook-declared', () => {
        const role = createTestRole({
          slug: 'architect',
          hooks: new RoleHooks({
            onBrain: {
              onTool: [createBootHook('echo tool event')],
            },
          }),
        });
        const registry = createTestRegistry([role]);
        const result = findRolesWithBootableButNoHook({ registry });
        expect(result).toEqual([
          {
            roleSlug: 'architect',
            hasBriefsDirs: true,
            hasSkillsDirs: true,
            reason: 'no-hook-declared',
          },
        ]);
      });
    });
  });

  given('[case5] empty onBoot array', () => {
    when('[t0] find is invoked', () => {
      then('returns violation with no-hook-declared', () => {
        const role = createTestRole({
          slug: 'designer',
          hooks: new RoleHooks({
            onBrain: {
              onBoot: [],
            },
          }),
        });
        const registry = createTestRegistry([role]);
        const result = findRolesWithBootableButNoHook({ registry });
        expect(result).toEqual([
          {
            roleSlug: 'designer',
            hasBriefsDirs: true,
            hasSkillsDirs: true,
            reason: 'no-hook-declared',
          },
        ]);
      });
    });
  });

  given('[case6] multiple roles, some invalid', () => {
    when('[t0] find is invoked', () => {
      then('returns all invalid roles', () => {
        const validRole = createTestRole({
          slug: 'valid',
          hooks: new RoleHooks({
            onBrain: {
              onBoot: [createBootHook('npx rhachet roles boot --role valid')],
            },
          }),
        });
        const invalidRole1 = createTestRole({
          slug: 'invalid1',
          hooks: undefined,
        });
        const invalidRole2 = createTestRole({
          slug: 'invalid2',
          hooks: new RoleHooks({}),
        });
        const registry = createTestRegistry([
          validRole,
          invalidRole1,
          invalidRole2,
        ]);
        const result = findRolesWithBootableButNoHook({ registry });
        expect(result).toHaveLength(2);
        expect(result.map((v) => v.roleSlug)).toEqual(['invalid1', 'invalid2']);
      });
    });
  });

  given('[case7] empty registry (zero roles)', () => {
    when('[t0] find is invoked', () => {
      then('returns empty array', () => {
        const registry = createTestRegistry([]);
        const result = findRolesWithBootableButNoHook({ registry });
        expect(result).toEqual([]);
      });
    });
  });

  given('[case8] onBoot hook with wrong command (no roles boot)', () => {
    when('[t0] find is invoked', () => {
      then('returns violation with absent-roles-boot-command', () => {
        const role = createTestRole({
          slug: 'designer',
          hooks: new RoleHooks({
            onBrain: {
              onBoot: [createBootHook('echo hello world')],
            },
          }),
        });
        const registry = createTestRegistry([role]);
        const result = findRolesWithBootableButNoHook({ registry });
        expect(result).toEqual([
          {
            roleSlug: 'designer',
            hasBriefsDirs: true,
            hasSkillsDirs: true,
            reason: 'absent-roles-boot-command',
          },
        ]);
      });
    });
  });

  given('[case9] onBoot hook with wrong role name', () => {
    when('[t0] find is invoked', () => {
      then('returns violation with wrong-role-name', () => {
        const role = createTestRole({
          slug: 'designer',
          hooks: new RoleHooks({
            onBrain: {
              onBoot: [
                createBootHook('npx rhachet roles boot --role mechanic'),
              ],
            },
          }),
        });
        const registry = createTestRegistry([role]);
        const result = findRolesWithBootableButNoHook({ registry });
        expect(result).toEqual([
          {
            roleSlug: 'designer',
            hasBriefsDirs: true,
            hasSkillsDirs: true,
            reason: 'wrong-role-name',
          },
        ]);
      });
    });
  });

  given('[case10] onBoot hook with rhx roles boot --role <slug>', () => {
    when('[t0] find is invoked', () => {
      then('returns empty array (valid)', () => {
        const role = createTestRole({
          slug: 'designer',
          hooks: new RoleHooks({
            onBrain: {
              onBoot: [
                createBootHook('rhx roles boot --repo .this --role designer'),
              ],
            },
          }),
        });
        const registry = createTestRegistry([role]);
        const result = findRolesWithBootableButNoHook({ registry });
        expect(result).toEqual([]);
      });
    });
  });

  given(
    '[case11] onBoot hook with npx rhachet roles boot --role <slug>',
    () => {
      when('[t0] find is invoked', () => {
        then('returns empty array (valid)', () => {
          const role = createTestRole({
            slug: 'mechanic',
            hooks: new RoleHooks({
              onBrain: {
                onBoot: [
                  createBootHook(
                    'npx rhachet roles boot --repo ehmpathy --role mechanic',
                  ),
                ],
              },
            }),
          });
          const registry = createTestRegistry([role]);
          const result = findRolesWithBootableButNoHook({ registry });
          expect(result).toEqual([]);
        });
      });
    },
  );

  given('[case12] onBoot hook boots multiple roles, this one present', () => {
    when('[t0] find is invoked', () => {
      then('returns empty array (valid)', () => {
        const role = createTestRole({
          slug: 'designer',
          hooks: new RoleHooks({
            onBrain: {
              onBoot: [
                createBootHook('npx rhachet roles boot --role mechanic'),
                createBootHook('npx rhachet roles boot --role designer'),
              ],
            },
          }),
        });
        const registry = createTestRegistry([role]);
        const result = findRolesWithBootableButNoHook({ registry });
        expect(result).toEqual([]);
      });
    });
  });

  given('[case13] multiple violations with different reasons', () => {
    when('[t0] find is invoked', () => {
      then('returns all violations with correct reasons', () => {
        const noHookRole = createTestRole({
          slug: 'no-hook',
          hooks: undefined,
        });
        const wrongCommandRole = createTestRole({
          slug: 'wrong-command',
          hooks: new RoleHooks({
            onBrain: {
              onBoot: [createBootHook('echo hello')],
            },
          }),
        });
        const wrongRoleRole = createTestRole({
          slug: 'wrong-role',
          hooks: new RoleHooks({
            onBrain: {
              onBoot: [createBootHook('npx rhachet roles boot --role other')],
            },
          }),
        });
        const registry = createTestRegistry([
          noHookRole,
          wrongCommandRole,
          wrongRoleRole,
        ]);
        const result = findRolesWithBootableButNoHook({ registry });
        expect(result).toEqual([
          {
            roleSlug: 'no-hook',
            hasBriefsDirs: true,
            hasSkillsDirs: true,
            reason: 'no-hook-declared',
          },
          {
            roleSlug: 'wrong-command',
            hasBriefsDirs: true,
            hasSkillsDirs: true,
            reason: 'absent-roles-boot-command',
          },
          {
            roleSlug: 'wrong-role',
            hasBriefsDirs: true,
            hasSkillsDirs: true,
            reason: 'wrong-role-name',
          },
        ]);
      });
    });
  });
});
