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
              { command: 'npx rhachet roles boot', timeout: 'PT30S' },
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
});
