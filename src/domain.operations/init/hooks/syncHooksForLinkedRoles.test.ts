import { given, then, useBeforeAll, when } from 'test-fns';

import { ContextCli } from '@src/domain.objects/ContextCli';

import { syncHooksForLinkedRoles } from './syncHooksForLinkedRoles';

// mock dependencies
jest.mock('@src/domain.operations/brains/getLinkedRolesWithHooks');
jest.mock('@src/domain.operations/brains/pruneOrphanedRoleHooksFromAllBrains');
jest.mock('@src/domain.operations/brains/syncAllRoleHooksIntoEachBrainRepl');

import { getLinkedRolesWithHooks } from '@src/domain.operations/brains/getLinkedRolesWithHooks';
import { pruneOrphanedRoleHooksFromAllBrains } from '@src/domain.operations/brains/pruneOrphanedRoleHooksFromAllBrains';
import { syncAllRoleHooksIntoEachBrainRepl } from '@src/domain.operations/brains/syncAllRoleHooksIntoEachBrainRepl';

const mockGetLinkedRolesWithHooks = getLinkedRolesWithHooks as jest.Mock;
const mockPruneOrphanedRoleHooksFromAllBrains =
  pruneOrphanedRoleHooksFromAllBrains as jest.Mock;
const mockSyncAllRoleHooksIntoEachBrainRepl =
  syncAllRoleHooksIntoEachBrainRepl as jest.Mock;

/**
 * .what = captures console.log output for snapshot test
 */
const captureConsoleOutput = async (
  fn: () => Promise<unknown>,
): Promise<string> => {
  const logs: string[] = [];
  const originalLog = console.log;
  console.log = (...args: unknown[]) => logs.push(args.join(' '));
  try {
    await fn();
  } finally {
    console.log = originalLog;
  }
  return logs.join('\n');
};

describe('syncHooksForLinkedRoles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  given('[case1] no roles with hooks found', () => {
    const scene = useBeforeAll(async () => {
      mockGetLinkedRolesWithHooks.mockResolvedValue({
        roles: [],
        errors: [],
      });

      const output = await captureConsoleOutput(() =>
        syncHooksForLinkedRoles(
          {},
          new ContextCli({ cwd: '/tmp/test-repo', gitroot: '/tmp/test-repo' }),
        ),
      );
      return { output };
    });

    when('[t0] sync is executed', () => {
      then('output matches snapshot', () => {
        expect(scene.output).toMatchSnapshot();
      });
    });
  });

  given('[case2] one role, one brain, one hook created', () => {
    const scene = useBeforeAll(async () => {
      mockGetLinkedRolesWithHooks.mockResolvedValue({
        roles: [{ slug: 'mechanic', repo: 'ehmpathy' }],
        errors: [],
      });
      mockPruneOrphanedRoleHooksFromAllBrains.mockResolvedValue({
        removed: [],
      });
      mockSyncAllRoleHooksIntoEachBrainRepl.mockResolvedValue({
        applied: [
          {
            role: { slug: 'mechanic', repo: 'ehmpathy' },
            brain: 'claude-code',
            hooks: {
              created: [{ command: 'echo hello' }],
              updated: [],
              deleted: [],
              unchanged: [],
            },
          },
        ],
        errors: [],
      });

      const output = await captureConsoleOutput(() =>
        syncHooksForLinkedRoles(
          {},
          new ContextCli({ cwd: '/tmp/test-repo', gitroot: '/tmp/test-repo' }),
        ),
      );
      return { output };
    });

    when('[t0] sync is executed', () => {
      then('output matches snapshot', () => {
        expect(scene.output).toMatchSnapshot();
      });
    });
  });

  given('[case3] multiple roles, multiple brains, mixed changes', () => {
    const scene = useBeforeAll(async () => {
      mockGetLinkedRolesWithHooks.mockResolvedValue({
        roles: [
          { slug: 'mechanic', repo: 'ehmpathy' },
          { slug: 'designer', repo: 'ehmpathy' },
        ],
        errors: [],
      });
      mockPruneOrphanedRoleHooksFromAllBrains.mockResolvedValue({
        removed: [
          {
            brain: 'claude-code',
            hooks: [{ command: 'orphan1' }, { command: 'orphan2' }],
          },
        ],
      });
      mockSyncAllRoleHooksIntoEachBrainRepl.mockResolvedValue({
        applied: [
          {
            role: { slug: 'mechanic', repo: 'ehmpathy' },
            brain: 'claude-code',
            hooks: {
              created: [{ command: 'echo boot' }],
              updated: [],
              deleted: [],
              unchanged: [],
            },
          },
          {
            role: { slug: 'mechanic', repo: 'ehmpathy' },
            brain: 'opencode',
            hooks: {
              created: [],
              updated: [{ command: 'echo updated' }],
              deleted: [],
              unchanged: [],
            },
          },
          {
            role: { slug: 'designer', repo: 'ehmpathy' },
            brain: 'claude-code',
            hooks: {
              created: [
                { command: 'echo design1' },
                { command: 'echo design2' },
              ],
              updated: [],
              deleted: [{ command: 'echo old' }],
              unchanged: [],
            },
          },
        ],
        errors: [],
      });

      const output = await captureConsoleOutput(() =>
        syncHooksForLinkedRoles(
          {},
          new ContextCli({ cwd: '/tmp/test-repo', gitroot: '/tmp/test-repo' }),
        ),
      );
      return { output };
    });

    when('[t0] sync is executed', () => {
      then('output matches snapshot', () => {
        expect(scene.output).toMatchSnapshot();
      });
    });
  });

  given('[case4] no changes needed', () => {
    const scene = useBeforeAll(async () => {
      mockGetLinkedRolesWithHooks.mockResolvedValue({
        roles: [{ slug: 'mechanic', repo: 'ehmpathy' }],
        errors: [],
      });
      mockPruneOrphanedRoleHooksFromAllBrains.mockResolvedValue({
        removed: [],
      });
      mockSyncAllRoleHooksIntoEachBrainRepl.mockResolvedValue({
        applied: [
          {
            role: { slug: 'mechanic', repo: 'ehmpathy' },
            brain: 'claude-code',
            hooks: {
              created: [],
              updated: [],
              deleted: [],
              unchanged: [{ command: 'echo hello' }],
            },
          },
        ],
        errors: [],
      });

      const output = await captureConsoleOutput(() =>
        syncHooksForLinkedRoles(
          {},
          new ContextCli({ cwd: '/tmp/test-repo', gitroot: '/tmp/test-repo' }),
        ),
      );
      return { output };
    });

    when('[t0] sync is executed', () => {
      then('output matches snapshot', () => {
        expect(scene.output).toMatchSnapshot();
      });
    });
  });

  given('[case5] errors on sync', () => {
    const scene = useBeforeAll(async () => {
      mockGetLinkedRolesWithHooks.mockResolvedValue({
        roles: [{ slug: 'mechanic', repo: 'ehmpathy' }],
        errors: [],
      });
      mockPruneOrphanedRoleHooksFromAllBrains.mockResolvedValue({
        removed: [],
      });
      mockSyncAllRoleHooksIntoEachBrainRepl.mockResolvedValue({
        applied: [],
        errors: [
          {
            role: { slug: 'mechanic', repo: 'ehmpathy' },
            brain: 'unknown-brain',
            error: new Error('no adapter found'),
          },
        ],
      });

      const output = await captureConsoleOutput(() =>
        syncHooksForLinkedRoles(
          {},
          new ContextCli({ cwd: '/tmp/test-repo', gitroot: '/tmp/test-repo' }),
        ),
      );
      return { output };
    });

    when('[t0] sync is executed', () => {
      then('output matches snapshot', () => {
        expect(scene.output).toMatchSnapshot();
      });
    });
  });

  given('[case6] discovery errors', () => {
    const scene = useBeforeAll(async () => {
      mockGetLinkedRolesWithHooks.mockResolvedValue({
        roles: [{ slug: 'mechanic', repo: 'ehmpathy' }],
        errors: [
          {
            repoSlug: 'broken-repo',
            roleSlug: 'broken-role',
            error: new Error('failed to parse role config'),
          },
        ],
      });
      mockPruneOrphanedRoleHooksFromAllBrains.mockResolvedValue({
        removed: [],
      });
      mockSyncAllRoleHooksIntoEachBrainRepl.mockResolvedValue({
        applied: [
          {
            role: { slug: 'mechanic', repo: 'ehmpathy' },
            brain: 'claude-code',
            hooks: {
              created: [{ command: 'echo hello' }],
              updated: [],
              deleted: [],
              unchanged: [],
            },
          },
        ],
        errors: [],
      });

      const output = await captureConsoleOutput(() =>
        syncHooksForLinkedRoles(
          {},
          new ContextCli({ cwd: '/tmp/test-repo', gitroot: '/tmp/test-repo' }),
        ),
      );
      return { output };
    });

    when('[t0] sync is executed', () => {
      then('output matches snapshot', () => {
        expect(scene.output).toMatchSnapshot();
      });
    });
  });
});
