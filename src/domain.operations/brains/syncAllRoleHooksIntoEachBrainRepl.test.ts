import { given, then, useBeforeAll, when } from 'test-fns';

import type { BrainHook } from '@src/domain.objects/BrainHook';
import type { BrainHooksAdapter } from '@src/domain.objects/BrainHooksAdapter';
import type { BrainSpecifier } from '@src/domain.objects/BrainSpecifier';
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

// mock brain detection
jest.mock('./detectBrainReplsInRepo', () => ({
  detectBrainReplsInRepo: jest.fn(),
}));

import { getBrainHooksAdapterByConfigImplicit } from '../config/getBrainHooksAdapterByConfigImplicit';
import { detectBrainReplsInRepo } from './detectBrainReplsInRepo';

const mockGetAdapter = getBrainHooksAdapterByConfigImplicit as jest.Mock;
const mockDetectBrains = detectBrainReplsInRepo as jest.Mock;

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
            onBoot: [{ command: 'npx rhachet roles boot', timeout: 'PT30S' }],
          },
        },
      }),
      repo: 'test-registry',
    };

    const adapter = createMockAdapter('claude-code', []);

    const result = useBeforeAll(async () => {
      mockDetectBrains.mockResolvedValue(['claude-code']);
      mockGetAdapter.mockResolvedValue(adapter);

      return syncAllRoleHooksIntoEachBrainRepl({
        roles: [role],
        repoPath: '/tmp/test-repo',
      });
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
        expect(result.applied[0]?.brain).toEqual('claude-code');
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

    const adapterClaude = createMockAdapter('claude-code', []);
    const adapterOpencode = createMockAdapter('opencode', []);

    const result = useBeforeAll(async () => {
      mockDetectBrains.mockResolvedValue(['claude-code', 'opencode']);
      mockGetAdapter.mockImplementation(async ({ brain }) => {
        if (brain === 'claude-code') return adapterClaude;
        if (brain === 'opencode') return adapterOpencode;
        return null;
      });

      return syncAllRoleHooksIntoEachBrainRepl({
        roles: [roleA, roleB],
        repoPath: '/tmp/test-repo',
      });
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

      return syncAllRoleHooksIntoEachBrainRepl({
        roles: [role],
        repoPath: '/tmp/test-repo',
      });
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

    const adapter = createMockAdapter('claude-code', []);

    const result = useBeforeAll(async () => {
      // detection would return both, but we only pass one explicitly
      mockDetectBrains.mockResolvedValue(['claude-code', 'opencode']);
      mockGetAdapter.mockResolvedValue(adapter);

      return syncAllRoleHooksIntoEachBrainRepl({
        roles: [role],
        repoPath: '/tmp/test-repo',
        brains: ['claude-code'], // explicit override
      });
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
});
