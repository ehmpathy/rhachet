import { BadRequestError, getError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import {
  Role,
  RoleHookOnBrain,
  RoleHooks,
  RoleRegistry,
} from '@src/domain.objects';

import { assertRegistryBootHooksDeclared } from './assertRegistryBootHooksDeclared';

describe('assertRegistryBootHooksDeclared', () => {
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

  given('[case1] all roles valid', () => {
    when('[t0] assert is invoked', () => {
      then('does not throw', () => {
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
        expect(() =>
          assertRegistryBootHooksDeclared({ registry }),
        ).not.toThrow();
      });
    });
  });

  given('[case2] role with no-hook-declared', () => {
    when('[t0] assert is invoked', () => {
      then('throws BadRequestError', async () => {
        const role = createTestRole({
          slug: 'designer',
          hooks: undefined,
        });
        const registry = createTestRegistry([role]);
        const error = await getError(() =>
          assertRegistryBootHooksDeclared({ registry }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
      });
    });
  });

  given('[case3] role with wrong command', () => {
    when('[t0] assert is invoked', () => {
      then('throws BadRequestError', async () => {
        const role = createTestRole({
          slug: 'designer',
          hooks: new RoleHooks({
            onBrain: {
              onBoot: [createBootHook('echo hello')],
            },
          }),
        });
        const registry = createTestRegistry([role]);
        const error = await getError(() =>
          assertRegistryBootHooksDeclared({ registry }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
      });
    });
  });

  given('[case4] role with wrong role name', () => {
    when('[t0] assert is invoked', () => {
      then('throws BadRequestError', async () => {
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
        const error = await getError(() =>
          assertRegistryBootHooksDeclared({ registry }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
      });
    });
  });

  given('[case5] error message contains role slug', () => {
    when('[t0] assert is invoked', () => {
      then('error message includes the role slug', async () => {
        const role = createTestRole({
          slug: 'my-custom-role',
          hooks: undefined,
        });
        const registry = createTestRegistry([role]);
        const error = await getError(() =>
          assertRegistryBootHooksDeclared({ registry }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect((error as BadRequestError).message).toContain('my-custom-role');
      });
    });
  });

  given('[case6] error message contains violation reason', () => {
    when('[t0] assert is invoked', () => {
      then('error message includes the reason', async () => {
        const role = createTestRole({
          slug: 'designer',
          hooks: undefined,
        });
        const registry = createTestRegistry([role]);
        const error = await getError(() =>
          assertRegistryBootHooksDeclared({ registry }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect((error as BadRequestError).message).toContain(
          'no-hook-declared',
        );
      });
    });
  });

  given('[case7] error message contains hint', () => {
    when('[t0] assert is invoked', () => {
      then('error message includes actionable hint', async () => {
        const role = createTestRole({
          slug: 'designer',
          hooks: undefined,
        });
        const registry = createTestRegistry([role]);
        const error = await getError(() =>
          assertRegistryBootHooksDeclared({ registry }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect((error as BadRequestError).message).toContain('hint:');
        expect((error as BadRequestError).message).toContain(
          'roles boot --role designer',
        );
      });
    });
  });

  given('[case8] multiple invalid with different reasons', () => {
    when('[t0] assert is invoked', () => {
      then('error lists all violations', async () => {
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
        const registry = createTestRegistry([noHookRole, wrongCommandRole]);
        const error = await getError(() =>
          assertRegistryBootHooksDeclared({ registry }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        const message = (error as BadRequestError).message;
        expect(message).toContain('no-hook');
        expect(message).toContain('wrong-command');
        expect(message).toContain('no-hook-declared');
        expect(message).toContain('absent-roles-boot-command');
      });
    });
  });

  given('[case9] empty registry', () => {
    when('[t0] assert is invoked', () => {
      then('does not throw', () => {
        const registry = createTestRegistry([]);
        expect(() =>
          assertRegistryBootHooksDeclared({ registry }),
        ).not.toThrow();
      });
    });
  });
});
