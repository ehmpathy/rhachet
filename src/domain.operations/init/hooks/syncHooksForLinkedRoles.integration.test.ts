import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { genSampleErrnoError } from '@src/.test/assets/genSampleErrnoError';
import { ContextCli } from '@src/domain.objects/ContextCli';

import { syncHooksForLinkedRoles } from './syncHooksForLinkedRoles';

/**
 * .mock = the orchestrator's leaf collaborators: role discovery, the prune, the per-brain sync,
 *         the actor read, and the per-actor settings derivation
 * .why = each case proves how the orchestrator collects and reports one kind of leaf fault — a
 *        failed brain sync, a broken role config, an actor derivation that rejects with an
 *        Error, with a non-Error, or with a code defect. a real leaf cannot be made to raise a
 *        rejected non-Error or a TypeError on demand, so the fault is injected at the leaf and
 *        all around it (the real cwd, `detectBrainReplsInRepo`, the report emitters) runs for
 *        real. case8 is a skip, not a fault: its brain dir links out for real, on a real temp
 *        dir, and the mocked brain sync serves as the counter that proves no root sync ran — a
 *        fact an empty outside dir alone cannot tell from a sync that wrote no file
 * .real = `invokeInit.integration` and the `init.hooks` acceptance suite drive these same paths
 *         through the real collaborators, with no mock at all; the case8 skip, with real role
 *         discovery and a real sync, is `init.hooks.outside-repo.acceptance` case6 and case13
 */
jest.mock('@src/domain.operations/brains/getLinkedRolesWithHooks');
jest.mock('@src/domain.operations/brains/pruneOrphanedRoleHooksFromAllBrains');
jest.mock('@src/domain.operations/brains/syncAllRoleHooksIntoEachBrainRepl');
jest.mock('@src/domain.operations/actor/enrolled/getAllActorsOndisk', () => ({
  getAllActorsOndisk: jest.fn(() => []),
}));
jest.mock('@src/domain.operations/enroll/genBrainCliConfigArtifact');

import { ActorOndisk } from '@src/domain.objects/ActorOndisk';
import { getAllActorsOndisk } from '@src/domain.operations/actor/enrolled/getAllActorsOndisk';
import { getLinkedRolesWithHooks } from '@src/domain.operations/brains/getLinkedRolesWithHooks';
import { pruneOrphanedRoleHooksFromAllBrains } from '@src/domain.operations/brains/pruneOrphanedRoleHooksFromAllBrains';
import { syncAllRoleHooksIntoEachBrainRepl } from '@src/domain.operations/brains/syncAllRoleHooksIntoEachBrainRepl';
import { genBrainCliConfigArtifact } from '@src/domain.operations/enroll/genBrainCliConfigArtifact';

import { mkdirSync, readdirSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';

const mockGetAllActorsOndisk = getAllActorsOndisk as jest.Mock;
const mockGenBrainCliConfigArtifact = genBrainCliConfigArtifact as jest.Mock;
const mockGetLinkedRolesWithHooks = getLinkedRolesWithHooks as jest.Mock;
const mockPruneOrphanedRoleHooksFromAllBrains =
  pruneOrphanedRoleHooksFromAllBrains as jest.Mock;
const mockSyncAllRoleHooksIntoEachBrainRepl =
  syncAllRoleHooksIntoEachBrainRepl as jest.Mock;

/**
 * .what = captures console.log output so the operator summary lines can be
 *   asserted (the orchestrator reports via console.log)
 * .note = returns the logic's result beside the output, so a caller needs no outer binding
 */
const captureConsoleOutput = async <T>(input: {
  logic: () => Promise<T>;
}): Promise<{ output: string; result: T }> => {
  // .note = deliberate mutation — a local log buffer swapped in for the duration
  //   of the call and restored in `finally`; scoped to this helper, never leaks
  const logs: string[] = [];
  const originalLog = console.log;
  console.log = (...args: unknown[]) => logs.push(args.join(' '));
  try {
    const result = await input.logic();
    return { output: logs.join('\n'), result };
  } finally {
    console.log = originalLog;
  }
};

/**
 * .what = the two loud error paths of syncHooksForLinkedRoles — the operator
 *   summary a human reads when a hook sync fails, and when role discovery fails
 * .why = restores the coverage the deleted syncHooksForLinkedRoles.test.ts held
 *   for these paths (rule.require.clamp-edge-cases). the leaf error construction
 *   is tested one layer down, but the orchestrator's own error-collection +
 *   `💥 N hook sync error(s)` summary was left unguarded — a regression that
 *   dropped the summary (a silent failure) would go undetected. the actor read
 *   returns [] until a case names the actors it needs
 */
describe('syncHooksForLinkedRoles (error paths)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  given('[case1] a role whose hook sync FAILS', () => {
    const scene = useBeforeAll(async () => {
      // the actor read is mocked to [] by default, so only the repo actor sync runs
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
            error: new MalfunctionError('no adapter found'),
          },
        ],
      });

      const context = new ContextCli({ cwd: dir, gitroot: dir });
      const { output, result } = await captureConsoleOutput({
        logic: () => syncHooksForLinkedRoles({}, context),
      });
      return { output, errors: result.errors };
    });

    when('[t0] sync is executed', () => {
      then('the sync error is collected into the returned errors', () => {
        expect(scene.errors).toHaveLength(1);
        expect(scene.errors[0]?.source).toContain('sync:ehmpathy/mechanic');
        expect(scene.errors[0]?.error.message).toContain('no adapter found');
      });

      then('the per-error line names the role, brain, class, and cause', () => {
        // 🚨 the CLASS token is the assertion that earns its keep: a glyph alone cannot be
        //   grepped, and a literal class would assert a verdict this site never read. the
        //   row leads with the neutral `✗` marker and the class is read off the error
        //   (`rule.require.unabridged-error-prefix`)
        expect(scene.output).toContain(
          '✗ ehmpathy/mechanic → unknown-brain: 💥 MalfunctionError: no adapter found',
        );
      });

      then('the operator sees the loud `1 hook sync error` summary', () => {
        // the one header syncHooksForLinkedRoles owns for a fault set, printed once
        expect(scene.output).toContain(
          '💥 MalfunctionError: 1 hook sync error — role hooks may be uninstalled',
        );
        expect(scene.output.split('hook sync error')).toHaveLength(2);
      });
    });
  });

  given('[case2] a role DISCOVERY error (a broken role config)', () => {
    const scene = useBeforeAll(async () => {
      // the actor read is mocked to [] by default
      const dir = genTempDir({ slug: 'sync-hooks-discover-err' });
      mockGetLinkedRolesWithHooks.mockResolvedValue({
        roles: [{ slug: 'mechanic', repo: 'ehmpathy' }],
        errors: [
          {
            repoSlug: 'broken-repo',
            roleSlug: 'broken-role',
            phase: 'use' as const,
            error: new ConstraintError('failed to parse role config'),
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
      const { output, result } = await captureConsoleOutput({
        logic: () => syncHooksForLinkedRoles({}, context),
      });
      return { output, errors: result.errors };
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

      then(
        'the discovery-error line names the class, not a glyph alone',
        () => {
          // the same clamp the sync row carries — a phase tag says WHICH layer faulted, the
          // class token says WHAT was raised there, and only the pair is actionable
          expect(scene.output).toContain(
            'broken-repo/broken-role [use]: ✋ ConstraintError: failed to parse role config',
          );
        },
      );
    });
  });

  /**
   * .what = the PER-ACTOR fault sources — each is printed and aggregated, never dropped
   * .why = `invokeInit.ts` sets the exit code from `errors.length` and prints none of them,
   *   so a fault this operation drops is a fault no caller ever reports
   */
  given('[case3] an enrolled actor whose settings derivation FAILS', () => {
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'sync-hooks-actor-err' });
      mockGetLinkedRolesWithHooks.mockResolvedValue({
        roles: [{ slug: 'mechanic', repo: 'ehmpathy' }],
        errors: [],
      });
      mockPruneOrphanedRoleHooksFromAllBrains.mockResolvedValue({
        removed: [],
      });
      mockSyncAllRoleHooksIntoEachBrainRepl.mockResolvedValue({
        applied: [],
        errors: [],
      });
      mockGetAllActorsOndisk.mockReturnValue([
        new ActorOndisk({
          repoPath: dir,
          exid: 'hash=051970ec',
          brain: 'claude',
          roles: ['mechanic'],
        }),
      ]);
      mockGenBrainCliConfigArtifact.mockRejectedValue(
        new Error('EACCES: permission denied'),
      );

      const context = new ContextCli({ cwd: dir, gitroot: dir });
      const { output, result } = await captureConsoleOutput({
        logic: () => syncHooksForLinkedRoles({}, context),
      });
      return { output, errors: result.errors };
    });

    when('[t0] sync is executed', () => {
      then('the actor fault is collected into the returned errors', () => {
        expect(scene.errors).toHaveLength(1);
        expect(scene.errors[0]?.source).toEqual('sync:actor=hash=051970ec');
      });

      then('the actor row reads as a fault, never a quiet no-op', () => {
        // a `✗` marker on the row, and the class read off the error on the leaf beneath it
        const lines = scene.output.split('\n');
        const actorAt = lines.indexOf('🧢 apply hooks to enrolled actors...');
        expect(actorAt).toBeGreaterThan(-1);
        expect(lines[actorAt + 1]).toEqual('   └─ ✗ hash=051970ec');
        expect(lines[actorAt + 2]).toEqual(
          '      ├─ error = Error: EACCES: permission denied',
        );
      });
    });
  });

  given(
    '[case4] an enrolled actor whose derivation rejects a non-Error',
    () => {
      const scene = useBeforeAll(async () => {
        const dir = genTempDir({ slug: 'sync-hooks-actor-nonerror' });
        mockGetLinkedRolesWithHooks.mockResolvedValue({
          roles: [{ slug: 'mechanic', repo: 'ehmpathy' }],
          errors: [],
        });
        mockPruneOrphanedRoleHooksFromAllBrains.mockResolvedValue({
          removed: [],
        });
        mockSyncAllRoleHooksIntoEachBrainRepl.mockResolvedValue({
          applied: [],
          errors: [],
        });
        mockGetAllActorsOndisk.mockReturnValue([
          new ActorOndisk({
            repoPath: dir,
            exid: 'hash=051970ec',
            brain: 'claude',
            roles: ['mechanic'],
          }),
        ]);
        mockGenBrainCliConfigArtifact.mockRejectedValue('a bare string reason');

        const context = new ContextCli({ cwd: dir, gitroot: dir });
        const { output, result } = await captureConsoleOutput({
          logic: () => syncHooksForLinkedRoles({}, context),
        });
        return { output, errors: result.errors };
      });

      when('[t0] sync is executed', () => {
        then('the fault is wrapped in a MalfunctionError', () => {
          expect(scene.errors).toHaveLength(1);
          expect(scene.errors[0]?.error).toBeInstanceOf(MalfunctionError);
        });

        then(
          'the roles, the path and the fix read beneath the actor row',
          () => {
            const lines = scene.output.split('\n');
            const actorAt = lines.indexOf(
              '🧢 apply hooks to enrolled actors...',
            );
            expect(lines[actorAt + 1]).toEqual('   └─ ✗ hash=051970ec');
            expect(lines[actorAt + 2]).toEqual(
              '      ├─ error = 💥 MalfunctionError: actor settings derivation rejected',
            );
            expect(lines.slice(actorAt + 3, actorAt + 6)).toEqual([
              '      ├─ roles = mechanic',
              '      ├─ path = .agent/.actors/actor.via.hash=051970ec/brain/.claude',
              '      └─ hint = rerun `rhx init --hooks`; if it fails again, report this output as a rhachet bug',
            ]);
          },
        );
      });
    },
  );

  given('[case5] an enrolled actor whose derivation hits a code defect', () => {
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'sync-hooks-actor-defect' });
      mockGetLinkedRolesWithHooks.mockResolvedValue({
        roles: [{ slug: 'mechanic', repo: 'ehmpathy' }],
        errors: [],
      });
      mockPruneOrphanedRoleHooksFromAllBrains.mockResolvedValue({
        removed: [],
      });
      mockSyncAllRoleHooksIntoEachBrainRepl.mockResolvedValue({
        applied: [],
        errors: [],
      });
      mockGetAllActorsOndisk.mockReturnValue([
        new ActorOndisk({
          repoPath: dir,
          exid: 'hash=051970ec',
          brain: 'claude',
          roles: ['mechanic'],
        }),
      ]);
      mockGenBrainCliConfigArtifact.mockRejectedValue(
        new TypeError("cannot read properties of undefined (reading 'hooks')"),
      );

      const context = new ContextCli({ cwd: dir, gitroot: dir });
      const error = await captureConsoleOutput({
        logic: () => syncHooksForLinkedRoles({}, context),
      }).then(
        () => null,
        (caught: unknown) => caught,
      );
      return { error };
    });

    when('[t0] sync is executed', () => {
      then('the defect is rethrown, never folded into an actor row', () => {
        expect(scene.error).toBeInstanceOf(TypeError);
      });
    });
  });
});
given('[case6] the ROOT sync THROWS an fs fault', () => {
  const scene = useBeforeAll(async () => {
    const dir = genTempDir({ slug: 'sync-hooks-root-throw' });
    mockGetLinkedRolesWithHooks.mockResolvedValue({
      roles: [{ slug: 'mechanic', repo: 'ehmpathy' }],
      errors: [],
    });
    mockGetAllActorsOndisk.mockReturnValue([
      new ActorOndisk({
        repoPath: dir,
        exid: 'hash=bee9012f',
        brain: 'claude',
        roles: ['mechanic'],
      }),
    ]);
    mockSyncAllRoleHooksIntoEachBrainRepl.mockResolvedValue({
      applied: [],
      errors: [],
    });
    // the root prune is the first call, so its throw exercises the root catch arm
    mockPruneOrphanedRoleHooksFromAllBrains
      .mockRejectedValueOnce(
        genSampleErrnoError({
          code: 'EACCES',
          message: 'settings.json is locked',
        }),
      )
      .mockResolvedValue({ removed: [] });

    mockGenBrainCliConfigArtifact.mockResolvedValue({
      configPath: `${dir}/settings.of.repo.json`,
    });

    const context = new ContextCli({ cwd: dir, gitroot: dir });
    const { output, result } = await captureConsoleOutput({
      logic: () => syncHooksForLinkedRoles({}, context),
    });
    return { output, errors: result.errors };
  });

  when('[t0] sync is executed', () => {
    then('the root fault reaches the operator, with its cause', () => {
      expect(scene.output).toContain('✗ root: Error: settings.json is locked');
      expect(scene.output).toContain(
        '💥 MalfunctionError: 1 hook sync error — role hooks may be uninstalled',
      );
    });

    then('the root fault is aggregated, never thrown', () => {
      expect(scene.errors.map((e) => e.source)).toEqual(['sync:root']);
    });

    then('the sweep CONTINUES to the actors', () => {
      expect(scene.output).toContain('hash=bee9012f');
    });
  });
});

given('[case7] the ROOT prune lands, then the ROOT sync THROWS', () => {
  const scene = useBeforeAll(async () => {
    // no actors on disk: the root call pair is the only one in play
    const dir = genTempDir({ slug: 'sync-hooks-root-prune-landed' });
    mockGetLinkedRolesWithHooks.mockResolvedValue({
      roles: [{ slug: 'mechanic', repo: 'ehmpathy' }],
      errors: [],
    });
    mockPruneOrphanedRoleHooksFromAllBrains.mockResolvedValue({
      removed: [{ hooks: [{}, {}] }],
    });
    mockSyncAllRoleHooksIntoEachBrainRepl.mockRejectedValueOnce(
      genSampleErrnoError({
        code: 'EACCES',
        message: 'settings.json is locked',
      }),
    );

    mockGenBrainCliConfigArtifact.mockResolvedValue({
      configPath: `${dir}/settings.of.repo.json`,
    });

    const context = new ContextCli({ cwd: dir, gitroot: dir });
    const { output, result } = await captureConsoleOutput({
      logic: () => syncHooksForLinkedRoles({}, context),
    });
    return { output, errors: result.errors };
  });

  when('[t0] sync is executed', () => {
    then('the removals the prune wrote are still reported', () => {
      // the prune mutated configs on disk before the sync faulted, so a report of 0 would
      // state the opposite of what the process did
      expect(scene.output).toContain('2 orphans removed');
    });

    then('the sync fault is reported beside them', () => {
      expect(scene.output).toContain('✗ root: Error: settings.json is locked');
      expect(scene.errors.map((e) => e.source)).toEqual(['sync:root']);
    });
  });
});

given(
  '[case8] the root sync is skipped, as its brain dir lands outside the repo',
  () => {
    const scene = useBeforeAll(async () => {
      // the actors root links out, and `<repo>/.claude` reaches the repo actor's brain dir through
      //   it, so the shield's entry guard refuses that dir
      const dir = genTempDir({ slug: 'sync-hooks-root-skipped' });
      const outside = genTempDir({ slug: 'sync-hooks-root-skipped-outside' });
      const outsideBrainDir = join(
        outside,
        'actor.via.repo=ambient',
        'brain',
        '.claude',
      );
      mkdirSync(outsideBrainDir, { recursive: true });
      mkdirSync(join(dir, '.agent'), { recursive: true });
      symlinkSync(outside, join(dir, '.agent', '.actors'));
      symlinkSync(
        '.agent/.actors/actor.via.repo=ambient/brain/.claude',
        join(dir, '.claude'),
      );
      mockGetAllActorsOndisk.mockReturnValue([]);
      mockGetLinkedRolesWithHooks.mockResolvedValue({
        roles: [{ slug: 'mechanic', repo: 'ehmpathy' }],
        errors: [],
      });

      // the count is read as a delta: earlier cases in this file share the mock
      const callsBefore =
        mockSyncAllRoleHooksIntoEachBrainRepl.mock.calls.length;
      const context = new ContextCli({ cwd: dir, gitroot: dir });
      const { output, result } = await captureConsoleOutput({
        logic: () =>
          syncHooksForLinkedRoles(
            { brains: ['anthropic/claude/code'] },
            context,
          ),
      });
      return {
        output,
        errors: result.errors,
        isSyncCalled:
          mockSyncAllRoleHooksIntoEachBrainRepl.mock.calls.length > callsBefore,
        outsideEntries: readdirSync(outsideBrainDir),
      };
    });

    when('[t0] sync is executed', () => {
      then('it never reads as a clean sync', () => {
        expect(scene.output).not.toContain('no changes needed');
      });

      then('the skip warn names the dir, and no error is counted', () => {
        expect(scene.output).toContain('⚠️ skipped a write outside the repo');
        expect(scene.errors).toEqual([]);
      });

      then('no root sync ran, and the outside brain dir stays empty', () => {
        expect(scene.isSyncCalled).toBe(false);
        expect(scene.outsideEntries).toEqual([]);
      });
    });
  },
);
