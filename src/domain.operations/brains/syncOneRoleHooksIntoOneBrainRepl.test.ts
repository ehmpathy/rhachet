import { given, then, useBeforeAll, when } from 'test-fns';

import { BrainHook } from '@src/domain.objects/BrainHook';
import type { BrainHooksAdapter } from '@src/domain.objects/BrainHooksAdapter';
import type { HasRepo } from '@src/domain.objects/HasRepo';
import { Role } from '@src/domain.objects/Role';

import { syncOneRoleHooksIntoOneBrainRepl } from './syncOneRoleHooksIntoOneBrainRepl';

/**
 * .what = creates a mock adapter for tests
 */
const createMockAdapter = (
  hooksFound: BrainHook[] = [],
): BrainHooksAdapter & { calls: { upsert: BrainHook[]; del: BrainHook[] } } => {
  const calls = { upsert: [] as BrainHook[], del: [] as BrainHook[] };

  return {
    slug: 'test-adapter',
    calls,
    dao: {
      get: {
        one: jest.fn().mockResolvedValue(null),
        all: jest.fn().mockResolvedValue(hooksFound),
      },
      set: {
        findsert: jest.fn().mockImplementation(async ({ hook }) => {
          calls.upsert.push(hook);
          return hook;
        }),
        upsert: jest.fn().mockImplementation(async ({ hook }) => {
          calls.upsert.push(hook);
          return hook;
        }),
      },
      del: jest.fn().mockImplementation(async ({ by }) => {
        const hook = hooksFound.find(
          (h) =>
            h.author === by.unique.author &&
            h.event === by.unique.event &&
            h.command === by.unique.command,
        );
        if (hook) calls.del.push(hook);
      }),
    },
  };
};

describe('syncOneRoleHooksIntoOneBrainRepl', () => {
  given('[case1] role with onBoot hooks, empty config', () => {
    const role: HasRepo<Role> = {
      ...new Role({
        slug: 'mechanic',
        name: 'Mechanic',
        purpose: 'test role',
        readme: { uri: 'readme.md' },
        traits: [],
        skills: { dirs: { uri: 'skills' }, refs: [] },
        briefs: { dirs: { uri: 'briefs' } },
        hooks: {
          onBrain: {
            onBoot: [
              {
                command: './node_modules/.bin/rhachet roles boot',
                timeout: 'PT30S',
              },
              { command: 'echo hello', timeout: 'PT5S' },
            ],
          },
        },
      }),
      repo: 'test-registry',
    };

    const adapter = createMockAdapter([]);

    const result = useBeforeAll(async () =>
      syncOneRoleHooksIntoOneBrainRepl({ role, adapter }),
    );

    when('[t0] sync is executed', () => {
      then('creates 2 hooks', () => {
        expect(result.hooks.created).toHaveLength(2);
      });

      then('updates 0 hooks', () => {
        expect(result.hooks.updated).toHaveLength(0);
      });

      then('deletes 0 hooks', () => {
        expect(result.hooks.deleted).toHaveLength(0);
      });

      then('calls upsert for each hook', () => {
        expect(adapter.calls.upsert).toHaveLength(2);
      });

      then('created hooks have correct author', () => {
        expect(result.hooks.created[0]?.author).toEqual(
          'repo=test-registry/role=mechanic',
        );
      });
    });
  });

  given('[case2] role removes a prior hook', () => {
    const role: HasRepo<Role> = {
      ...new Role({
        slug: 'mechanic',
        name: 'Mechanic',
        purpose: 'test role',
        readme: { uri: 'readme.md' },
        traits: [],
        skills: { dirs: { uri: 'skills' }, refs: [] },
        briefs: { dirs: { uri: 'briefs' } },
        hooks: {
          onBrain: {
            onBoot: [{ command: 'npx rhachet roles boot', timeout: 'PT30S' }],
          },
        },
      }),
      repo: 'test-registry',
    };

    // config has a hook that's no longer declared
    const hookFound = new BrainHook({
      author: 'repo=test-registry/role=mechanic',
      event: 'onBoot',
      command: 'echo old-hook',
      timeout: 'PT10S',
    });

    const adapter = createMockAdapter([hookFound]);

    const result = useBeforeAll(async () =>
      syncOneRoleHooksIntoOneBrainRepl({ role, adapter }),
    );

    when('[t0] sync is executed', () => {
      then('creates 1 hook', () => {
        expect(result.hooks.created).toHaveLength(1);
      });

      then('deletes 1 hook', () => {
        expect(result.hooks.deleted).toHaveLength(1);
      });

      then('deleted hook is the old one', () => {
        expect(result.hooks.deleted[0]?.command).toEqual('echo old-hook');
      });
    });
  });

  given('[case3] role with no hooks', () => {
    const role: HasRepo<Role> = {
      ...new Role({
        slug: 'mechanic',
        name: 'Mechanic',
        purpose: 'test role',
        readme: { uri: 'readme.md' },
        traits: [],
        skills: { dirs: { uri: 'skills' }, refs: [] },
        briefs: { dirs: { uri: 'briefs' } },
      }),
      repo: 'test-registry',
    };

    const adapter = createMockAdapter([]);

    const result = useBeforeAll(async () =>
      syncOneRoleHooksIntoOneBrainRepl({ role, adapter }),
    );

    when('[t0] sync is executed', () => {
      then('creates 0 hooks', () => {
        expect(result.hooks.created).toHaveLength(0);
      });

      then('updates 0 hooks', () => {
        expect(result.hooks.updated).toHaveLength(0);
      });

      then('deletes 0 hooks', () => {
        expect(result.hooks.deleted).toHaveLength(0);
      });
    });
  });

  given(
    '[case3b] a re-sync where the brain reads back the timeout in another unit',
    () => {
      // the claude adapter writes a timeout as milliseconds and reads it back as
      //   `{ milliseconds }`, while a role declares it as an iso duration (`PT30S`). the same
      //   duration must read as unchanged, or every re-run of `rhx init --hooks` reports and
      //   rewrites every hook as `~updated`
      const role: HasRepo<Role> = {
        ...new Role({
          slug: 'mechanic',
          name: 'Mechanic',
          purpose: 'test role',
          readme: { uri: 'readme.md' },
          traits: [],
          skills: { dirs: { uri: 'skills' }, refs: [] },
          briefs: { dirs: { uri: 'briefs' } },
          hooks: {
            onBrain: {
              onBoot: [{ command: 'npx rhachet roles boot', timeout: 'PT30S' }],
              onTool: [
                {
                  command: 'echo guard',
                  timeout: 'PT5S',
                  filter: { what: 'Bash', when: 'before' },
                },
              ],
            },
          },
        }),
        repo: 'test-registry',
      };
      const author = 'repo=test-registry/role=mechanic';

      when(
        '[t0] the brain holds the same hooks, timeouts read back in milliseconds',
        () => {
          const adapter = createMockAdapter([
            new BrainHook({
              author,
              event: 'onBoot',
              command: 'npx rhachet roles boot',
              timeout: { milliseconds: 30000 },
            }),
            new BrainHook({
              author,
              event: 'onTool',
              command: 'echo guard',
              timeout: { milliseconds: 5000 },
              filter: { what: 'Bash' },
            }),
          ]);
          const result = useBeforeAll(async () =>
            syncOneRoleHooksIntoOneBrainRepl({ role, adapter }),
          );

          then('both hooks read as unchanged, and none is rewritten', () => {
            expect(result.hooks).toMatchObject({
              created: [],
              updated: [],
              deleted: [],
            });
            expect(result.hooks.unchanged).toHaveLength(2);
            expect(adapter.calls.upsert).toEqual([]);
          });
        },
      );

      when('[t1] the brain holds the hook with a different timeout', () => {
        const adapter = createMockAdapter([
          new BrainHook({
            author,
            event: 'onBoot',
            command: 'npx rhachet roles boot',
            timeout: { milliseconds: 10000 },
          }),
        ]);
        const result = useBeforeAll(async () =>
          syncOneRoleHooksIntoOneBrainRepl({ role, adapter }),
        );

        then('the changed duration still reads as updated', () => {
          expect(result.hooks.updated.map((hook) => hook.command)).toEqual([
            'npx rhachet roles boot',
          ]);
        });
      });

      when(
        '[t2] the role declares a non-default when, and the brain holds none',
        () => {
          const roleAfter: HasRepo<Role> = {
            ...role,
            hooks: {
              onBrain: {
                onTool: [
                  {
                    command: 'echo guard',
                    timeout: 'PT5S',
                    filter: { what: 'Bash', when: 'after' },
                  },
                ],
              },
            },
          };
          const adapter = createMockAdapter([
            new BrainHook({
              author,
              event: 'onTool',
              command: 'echo guard',
              timeout: { milliseconds: 5000 },
              filter: { what: 'Bash' },
            }),
          ]);
          const result = useBeforeAll(async () =>
            syncOneRoleHooksIntoOneBrainRepl({ role: roleAfter, adapter }),
          );

          then('the hook reads as updated', () => {
            expect(result.hooks.updated.map((hook) => hook.command)).toEqual([
              'echo guard',
            ]);
          });
        },
      );

      when(
        '[t3] the role declares a non-iso timeout string, and the brain holds the hook',
        () => {
          // the diff is no validator: a timeout it cannot read as a duration is compared
          //   as declared, and the brain adapter keeps the call on whether it is valid
          const roleNonIso: HasRepo<Role> = {
            ...role,
            hooks: {
              onBrain: {
                onBoot: [
                  {
                    command: 'npx rhachet roles boot',
                    timeout: '10s' as BrainHook['timeout'],
                  },
                ],
              },
            },
          };
          const adapter = createMockAdapter([
            new BrainHook({
              author,
              event: 'onBoot',
              command: 'npx rhachet roles boot',
              timeout: '10s' as BrainHook['timeout'],
            }),
          ]);
          const result = useBeforeAll(async () =>
            syncOneRoleHooksIntoOneBrainRepl({ role: roleNonIso, adapter }),
          );

          then(
            'the diff does not throw, and the same hook reads as unchanged',
            () => {
              expect(
                result.hooks.unchanged.map((hook) => hook.command),
              ).toEqual(['npx rhachet roles boot']);
              expect(adapter.calls.upsert).toEqual([]);
            },
          );
        },
      );
    },
  );

  given('[case4] role with onTalk hooks', () => {
    const role: HasRepo<Role> = {
      ...new Role({
        slug: 'achiever',
        name: 'Achiever',
        purpose: 'test role',
        readme: { uri: 'readme.md' },
        traits: [],
        skills: { dirs: { uri: 'skills' }, refs: [] },
        briefs: { dirs: { uri: 'briefs' } },
        hooks: {
          onBrain: {
            onTalk: [{ command: 'echo "accumulate ask"', timeout: 'PT5S' }],
          },
        },
      }),
      repo: 'test-registry',
    };

    const adapter = createMockAdapter([]);

    const result = useBeforeAll(async () =>
      syncOneRoleHooksIntoOneBrainRepl({ role, adapter }),
    );

    when('[t0] sync is executed', () => {
      then('creates 1 hook', () => {
        expect(result.hooks.created).toHaveLength(1);
      });

      then('created hook is onTalk event', () => {
        expect(result.hooks.created[0]?.event).toEqual('onTalk');
      });

      then('created hook has correct command', () => {
        expect(result.hooks.created[0]?.command).toEqual(
          'echo "accumulate ask"',
        );
      });

      then('created hook has correct author', () => {
        expect(result.hooks.created[0]?.author).toEqual(
          'repo=test-registry/role=achiever',
        );
      });
    });
  });
});
