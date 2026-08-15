import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { ContextCli } from '@src/domain.objects/ContextCli';

import { syncHooksForLinkedRoles } from './syncHooksForLinkedRoles';

// mock the leaf collaborators so this unit exercises the orchestrator's OWN
// error-collection + operator-report logic, not the leaves (whose behavior has
// its own coverage — e.g. syncAllRoleHooksIntoEachBrainRepl.test.ts)
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
 * .what = captures console.log output so the operator summary lines can be
 *   asserted (the orchestrator reports via console.log)
 */
const captureConsoleOutput = async (
  fn: () => Promise<unknown>,
): Promise<string> => {
  // .note = deliberate mutation — a local log buffer swapped in for the duration
  //   of the call and restored in `finally`; scoped to this helper, never leaks
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

/**
 * .what = the two loud error paths of syncHooksForLinkedRoles — the operator
 *   summary a human reads when a hook sync FAILS, and when role DISCOVERY fails
 * .why = restores the coverage the deleted syncHooksForLinkedRoles.test.ts held
 *   for these paths (rule.require.clamp-edge-cases). the leaf error CONSTRUCTION
 *   is tested one layer down, but the orchestrator's own error-collection +
 *   `⛈️ N hook sync error(s)` summary was left unguarded — a regression that
 *   dropped the summary (a silent failure) would go undetected. a REAL temp cwd
 *   makes getAllActorsOndisk return [] (no .agent/.actors), so the test is
 *   hermetic without a mock of the actor read
 */
describe('syncHooksForLinkedRoles (error paths)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  given('[case1] a role whose hook sync FAILS', () => {
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'sync-hooks-err' });
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

      // .note = a real temp cwd → getAllActorsOndisk reads no actors root → []
      const context = new ContextCli({ cwd: dir, gitroot: dir });
      let errors: Awaited<
        ReturnType<typeof syncHooksForLinkedRoles>
      >['errors'] = [];
      const output = await captureConsoleOutput(async () => {
        errors = (await syncHooksForLinkedRoles({}, context)).errors;
      });
      return { output, errors };
    });

    when('[t0] sync is executed', () => {
      then('the sync error is collected into the returned errors', () => {
        expect(scene.errors).toHaveLength(1);
        expect(scene.errors[0]?.source).toContain('sync:ehmpathy/mechanic');
        expect(scene.errors[0]?.error.message).toEqual('no adapter found');
      });

      then('the per-error line names the role, brain, and cause', () => {
        expect(scene.output).toContain(
          '⛈️  ehmpathy/mechanic → unknown-brain: no adapter found',
        );
      });

      then('the operator sees the loud `N hook sync error(s)` summary', () => {
        // the exact line syncHooksForLinkedRoles emits when sync errors > 0 —
        // the summary the deleted test locked, now re-guarded
        expect(scene.output).toContain('⛈️  1 hook sync error(s) occurred');
      });
    });
  });

  given('[case2] a role DISCOVERY error (a broken role config)', () => {
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'sync-hooks-discover-err' });
      mockGetLinkedRolesWithHooks.mockResolvedValue({
        roles: [{ slug: 'mechanic', repo: 'ehmpathy' }],
        errors: [
          {
            repoSlug: 'broken-repo',
            roleSlug: 'broken-role',
            phase: 'use' as const,
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
            hooks: { created: [], updated: [], deleted: [], unchanged: [] },
          },
        ],
        errors: [],
      });

      const context = new ContextCli({ cwd: dir, gitroot: dir });
      let errors: Awaited<
        ReturnType<typeof syncHooksForLinkedRoles>
      >['errors'] = [];
      const output = await captureConsoleOutput(async () => {
        errors = (await syncHooksForLinkedRoles({}, context)).errors;
      });
      return { output, errors };
    });

    when('[t0] sync is executed', () => {
      then('the discovery error is collected into the returned errors', () => {
        expect(scene.errors).toHaveLength(1);
        expect(scene.errors[0]?.source).toContain(
          'discover:broken-repo/broken-role',
        );
      });

      then(
        'the discovery-error line surfaces the phase tag to the operator',
        () => {
          expect(scene.output).toContain('broken-repo/broken-role [use]');
        },
      );
    });
  });
});
