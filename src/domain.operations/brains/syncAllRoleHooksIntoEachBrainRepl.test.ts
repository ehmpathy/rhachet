import { given, then, useBeforeAll, when } from 'test-fns';

import type { BrainHook } from '@src/domain.objects/BrainHook';
import type { BrainHooksAdapter } from '@src/domain.objects/BrainHooksAdapter';
import type { BrainSpecifier } from '@src/domain.objects/BrainSpecifier';
import { ContextCli } from '@src/domain.objects/ContextCli';
import type { HasRepo } from '@src/domain.objects/HasRepo';
import { Role } from '@src/domain.objects/Role';

import { syncAllRoleHooksIntoEachBrainRepl } from './syncAllRoleHooksIntoEachBrainRepl';

/**
 * .what = creates a mock adapter for tests
 */
const createMockAdapter = (
  slug: BrainSpecifier,
  hooksFound: BrainHook[] = [],
): BrainHooksAdapter & { calls: { upsert: BrainHook[]; del: BrainHook[] } } => {
  const calls = { upsert: [] as BrainHook[], del: [] as BrainHook[] };

  return {
    slug,
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

// mock the adapter resolution
jest.mock('../config/getBrainHooksAdapterByConfigImplicit', () => ({
  getBrainHooksAdapterByConfigImplicit: jest.fn(),
}));

// .note = the fixture brains are not claude code, so the sync writes through each brain's own
//   adapter, and this unit covers only the role × brain sweep; the claude code dispatch manifest
//   wrap is covered by its own integration tests and the hook dispatcher acceptance

// mock brain detection
jest.mock('./detectBrainReplsInRepo', () => ({
  detectBrainReplsInRepo: jest.fn(),
}));

// spy the dispatch selector: it delegates to the real one, so [case5] can see whether the
//   sync went through it at all
jest.mock('./dispatch/getOneBrainHooksAdapterForSync', () => {
  const actual = jest.requireActual(
    './dispatch/getOneBrainHooksAdapterForSync',
  );
  return {
    getOneBrainHooksAdapterForSync: jest.fn(
      actual.getOneBrainHooksAdapterForSync,
    ),
  };
});

import { getBrainHooksAdapterByConfigImplicit } from '@src/domain.operations/config/getBrainHooksAdapterByConfigImplicit';

import { detectBrainReplsInRepo } from './detectBrainReplsInRepo';
import { getOneBrainHooksAdapterForSync } from './dispatch/getOneBrainHooksAdapterForSync';

const mockGetAdapter = getBrainHooksAdapterByConfigImplicit as jest.Mock;
const mockDetectBrains = detectBrainReplsInRepo as jest.Mock;
const spyGetAdapterForSync = getOneBrainHooksAdapterForSync as jest.Mock;

describe('syncAllRoleHooksIntoEachBrainRepl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  given('[case1] single role with hooks, single brain', () => {
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
            ],
          },
        },
      }),
      repo: 'test-registry',
    };

    const adapter = createMockAdapter('test-brain', []);

    const result = useBeforeAll(async () => {
      mockDetectBrains.mockResolvedValue(['test-brain']);
      mockGetAdapter.mockResolvedValue(adapter);

      const context = new ContextCli({
        cwd: '/tmp/test-repo',
        gitroot: '/tmp/test-repo',
      });
      return syncAllRoleHooksIntoEachBrainRepl({ roles: [role] }, context);
    });

    when('[t0] sync is executed', () => {
      then('returns 1 applied result', () => {
        expect(result.applied).toHaveLength(1);
      });

      then('returns 0 errors', () => {
        expect(result.errors).toHaveLength(0);
      });

      then('applied result contains the role', () => {
        expect(result.applied[0]?.role.slug).toEqual('mechanic');
      });

      then('applied result contains the brain', () => {
        expect(result.applied[0]?.brain).toEqual('test-brain');
      });

      then('applied result shows 1 hook created', () => {
        expect(result.applied[0]?.hooks.created).toHaveLength(1);
      });
    });
  });

  given('[case2] multiple roles, multiple brains', () => {
    const roleA: HasRepo<Role> = {
      ...new Role({
        slug: 'mechanic',
        name: 'Mechanic',
        purpose: 'test role A',
        readme: { uri: 'readme.md' },
        traits: [],
        skills: { dirs: { uri: 'skills' }, refs: [] },
        briefs: { dirs: { uri: 'briefs' } },
        hooks: {
          onBrain: {
            onBoot: [{ command: 'echo mechanic', timeout: 'PT5S' }],
          },
        },
      }),
      repo: 'test-registry',
    };

    const roleB: HasRepo<Role> = {
      ...new Role({
        slug: 'designer',
        name: 'Designer',
        purpose: 'test role B',
        readme: { uri: 'readme.md' },
        traits: [],
        skills: { dirs: { uri: 'skills' }, refs: [] },
        briefs: { dirs: { uri: 'briefs' } },
        hooks: {
          onBrain: {
            onTool: [{ command: 'echo designer', timeout: 'PT10S' }],
          },
        },
      }),
      repo: 'test-registry',
    };

    const adapterClaude = createMockAdapter('test-brain', []);
    const adapterOpencode = createMockAdapter('opencode', []);

    const result = useBeforeAll(async () => {
      mockDetectBrains.mockResolvedValue(['test-brain', 'opencode']);
      mockGetAdapter.mockImplementation(async (input: { brain: string }) => {
        if (input.brain === 'test-brain') return adapterClaude;
        if (input.brain === 'opencode') return adapterOpencode;
        return null;
      });

      const context = new ContextCli({
        cwd: '/tmp/test-repo',
        gitroot: '/tmp/test-repo',
      });
      return syncAllRoleHooksIntoEachBrainRepl(
        { roles: [roleA, roleB] },
        context,
      );
    });

    when('[t0] sync is executed', () => {
      then('returns 4 applied results (2 roles × 2 brains)', () => {
        expect(result.applied).toHaveLength(4);
      });

      then('returns 0 errors', () => {
        expect(result.errors).toHaveLength(0);
      });
    });
  });

  given('[case3] brain with no adapter', () => {
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
            onBoot: [{ command: 'echo test', timeout: 'PT5S' }],
          },
        },
      }),
      repo: 'test-registry',
    };

    const result = useBeforeAll(async () => {
      mockDetectBrains.mockResolvedValue(['unknown-brain']);
      mockGetAdapter.mockResolvedValue(null);

      const context = new ContextCli({
        cwd: '/tmp/test-repo',
        gitroot: '/tmp/test-repo',
      });
      return syncAllRoleHooksIntoEachBrainRepl({ roles: [role] }, context);
    });

    when('[t0] sync is executed', () => {
      then('returns 0 applied results', () => {
        expect(result.applied).toHaveLength(0);
      });

      then('returns 1 error', () => {
        expect(result.errors).toHaveLength(1);
      });

      then('error mentions no adapter found', () => {
        expect(result.errors[0]?.error.message).toContain('no adapter found');
      });
    });
  });

  given('[case4] explicit brains override detection', () => {
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
            onBoot: [{ command: 'echo test', timeout: 'PT5S' }],
          },
        },
      }),
      repo: 'test-registry',
    };

    const adapter = createMockAdapter('test-brain', []);

    const result = useBeforeAll(async () => {
      // detection would return both, but we only pass one explicitly
      mockDetectBrains.mockResolvedValue(['test-brain', 'opencode']);
      mockGetAdapter.mockResolvedValue(adapter);

      const context = new ContextCli({
        cwd: '/tmp/test-repo',
        gitroot: '/tmp/test-repo',
      });
      return syncAllRoleHooksIntoEachBrainRepl(
        { roles: [role], brains: ['test-brain'] },
        context,
      );
    });

    when('[t0] sync is executed', () => {
      then('returns 1 applied result (only explicit brain)', () => {
        expect(result.applied).toHaveLength(1);
      });

      then('detection was not called', () => {
        expect(mockDetectBrains).not.toHaveBeenCalled();
      });
    });
  });

  given(
    '[case5] claude code, with hooks via brain (an in-mem union read)',
    () => {
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
              onBoot: [{ command: 'echo boot', timeout: 'PT30S' }],
            },
          },
        }),
        repo: 'test-registry',
      };

      const adapter = createMockAdapter('claude-code', []);

      const result = useBeforeAll(async () => {
        mockGetAdapter.mockResolvedValue(adapter);
        const context = new ContextCli({
          cwd: '/tmp/test-repo',
          gitroot: '/tmp/test-repo',
        });
        return syncAllRoleHooksIntoEachBrainRepl(
          { roles: [role], brains: ['claude-code'], hooksVia: 'brain' },
          context,
        );
      });

      when('[t0] sync is executed', () => {
        then('the dispatch selector is never asked for an adapter', () => {
          expect(spyGetAdapterForSync).not.toHaveBeenCalled();
        });

        then("the brain's own adapter receives the role hook as is", () => {
          expect(result.errors).toHaveLength(0);
          expect(adapter.calls.upsert.map((hook) => hook.command)).toEqual([
            'echo boot',
          ]);
        });
      });
    },
  );
});
