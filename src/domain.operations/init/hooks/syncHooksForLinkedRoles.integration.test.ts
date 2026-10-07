import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { genSampleErrnoError } from '@src/.test/assets/genSampleErrnoError';
import { ContextCli } from '@src/domain.objects/ContextCli';
import { asActorOndiskDirName } from '@src/domain.operations/actor/enrolled/asActorOndiskDirName';
import { getActorsRootDir } from '@src/domain.operations/actor/enrolled/getActorsRootDir';

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { syncHooksForLinkedRoles } from './syncHooksForLinkedRoles';

/**
 * .mock = the three leaf collaborators: role discovery, orphan prune, hook sync
 * .why = this suite grades the orchestrator's OWN error collection + operator report,
 *        so each leaf must fault on cue; a real fault per leaf needs a broken linked
 *        role package plus a brain no adapter claims. the actor read is driven real
 *        (a temp dir on disk), which is why the suite sits at integration grain
 * .real = each leaf has its own coverage, e.g. syncAllRoleHooksIntoEachBrainRepl.test.ts;
 *         the seam that would retire these mocks is caught in
 *         .dream/2026_09_25.two-unit-suites-mock-a-collaborator-a-seam-would-inject.md
 */
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
 * .what = writes ONE real enrolled actor into a temp repo's on-disk tree, so the
 *   REAL `getAllActorsOndisk` returns it
 *
 * .why = the per-actor cases need an actor in the loop, and a `jest.mock` of the
 *   actor read would cross a remote boundary this suite forbids
 *   (`rule.forbid.unit.remote-boundaries`). the read is a plain filesystem walk of
 *   `.agent/.actors/actor.via.hash=<hash>/actor.json`, so a real fixture costs two
 *   syscalls and exercises the dir-name parse + manifest parse the mock skipped
 *
 * .note = the path is composed through the format's own owners
 *   (`getActorsRootDir` + `asActorOndiskDirName`), never a hand-rolled literal — so
 *   a relocation of the convention moves this fixture with it
 */
const setOneActorOndisk = (input: {
  dir: string;
  hash: string;
  brain: string;
  roles: string[];
}): void => {
  const actorDir = join(
    getActorsRootDir({ repoPath: input.dir }),
    asActorOndiskDirName({ hash: input.hash }),
  );
  mkdirSync(actorDir, { recursive: true });
  writeFileSync(
    join(actorDir, 'actor.json'),
    JSON.stringify({ brain: input.brain, roles: input.roles }),
  );
};

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
 * .why = the leaf error CONSTRUCTION is tested one layer down; this guards the
 *   orchestrator's own error-collection and `💥 MalfunctionError: N hook sync errors` summary, so
 *   a regression that drops the summary (a silent failure) is caught
 *   (`rule.require.clamp-edge-cases`). a REAL temp cwd makes getAllActorsOndisk
 *   return [] (no .agent/.actors), so the test is hermetic without a mock of the
 *   actor read
 */
describe('syncHooksForLinkedRoles (error paths)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  given('[case1] a role whose hook sync FAILS', () => {
    const scene = useBeforeAll(async () => {
      // no `.agent/.actors` is written, so the REAL actor read returns [] — the
      // benign actor-path default needs no arrangement at all
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
      // no `.agent/.actors` written ⇒ the REAL actor read returns []
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
   *   so the report here is the only place a cause reaches the operator (`rule.require.failloud`)
   */
  given('[case3] an ACTOR whose role-hook sync faults', () => {
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'sync-hooks-actor-err' });
      mockGetLinkedRolesWithHooks.mockResolvedValue({
        roles: [{ slug: 'mechanic', repo: 'ehmpathy' }],
        errors: [],
      });
      mockPruneOrphanedRoleHooksFromAllBrains.mockResolvedValue({
        removed: [],
      });
      // 🔴 a REAL actor on disk, so the REAL read reconstructs the `ActorOndisk` —
      //   `repoPath` and `hash` come from the dir location, which is precisely the
      //   reconstruction a mocked return would have had to imitate (`rule.forbid.failhide`)
      setOneActorOndisk({
        dir,
        hash: 'abc1234deadbeef',
        brain: 'claude-code',
        roles: ['mechanic'],
      });

      // the ROOT sync is clean; only the ACTOR sync faults — so a regression that prints
      // the root fault and drops the actor one cannot pass this case
      mockSyncAllRoleHooksIntoEachBrainRepl
        .mockResolvedValueOnce({ applied: [], errors: [] })
        .mockResolvedValueOnce({
          applied: [],
          errors: [
            {
              role: { slug: 'mechanic', repo: 'ehmpathy' },
              brain: 'claude-code',
              error: new MalfunctionError('actor config dir is read-only'),
            },
          ],
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
      then('the per-actor fault reaches the operator, with its cause', () => {
        expect(scene.output).toContain(
          '✗ ehmpathy/mechanic→claude-code: 💥 MalfunctionError: actor config dir is read-only',
        );
      });

      then('the fault row nests UNDER its actor row', () => {
        // the actor is last of one, so its spine is blank and its child elbows from
        // column 3 — the treestruct contract `getOneTreeSpine`/`getOneTreeElbow` own
        expect(scene.output).toContain('   └─ abc1234deadbeef');
        expect(scene.output).toContain(
          '      └─ ✗ ehmpathy/mechanic→claude-code',
        );
      });

      then('it is aggregated, with the actor coordinate restored', () => {
        // the actor hash is carried WHOLE — it is the actor's entire name
        expect(scene.errors).toHaveLength(1);
        expect(scene.errors.map((e) => e.source)).toEqual([
          'sync:actor=abc1234deadbeef:ehmpathy/mechanic→claude-code',
        ]);
      });
    });
  });

  given('[case4] an ACTOR whose sync THROWS', () => {
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'sync-hooks-actor-throw' });
      mockGetLinkedRolesWithHooks.mockResolvedValue({
        roles: [{ slug: 'mechanic', repo: 'ehmpathy' }],
        errors: [],
      });
      setOneActorOndisk({
        dir,
        hash: 'fee5678cafebabe',
        brain: 'claude-code',
        roles: ['mechanic'],
      });
      mockSyncAllRoleHooksIntoEachBrainRepl.mockResolvedValue({
        applied: [],
        errors: [],
      });
      // the prune is the FIRST call inside the actor try — so a throw there exercises the
      // catch arm, which is the third fault source and the only one with no leaf `errors`
      mockPruneOrphanedRoleHooksFromAllBrains
        .mockResolvedValueOnce({ removed: [] })
        .mockRejectedValueOnce(
          genSampleErrnoError({
            code: 'ENOENT',
            message: 'actor brain dir vanished',
          }),
        );

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
      then('the thrown fault reaches the operator', () => {
        expect(scene.output).toContain(
          '✗ actor: Error: actor brain dir vanished',
        );
      });

      then('the thrown fault is aggregated under the actor hash', () => {
        expect(scene.errors).toHaveLength(1);
        expect(scene.errors[0]?.source).toEqual(
          'sync:actor=fee5678cafebabe:actor',
        );
      });

      then('the loop CONTINUES — the actor row still renders', () => {
        // a throw inside one actor must not abandon the report for the rest; the row is
        // what proves the catch resumed rather than propagated
        expect(scene.output).toContain('fee5678');
      });
    });
  });

  given('[case5] the ROOT sync THROWS an fs fault', () => {
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'sync-hooks-root-throw' });
      mockGetLinkedRolesWithHooks.mockResolvedValue({
        roles: [{ slug: 'mechanic', repo: 'ehmpathy' }],
        errors: [],
      });
      setOneActorOndisk({
        dir,
        hash: 'bee9012facade00',
        brain: 'claude-code',
        roles: ['mechanic'],
      });
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
      then('the root fault reaches the operator, with its cause', () => {
        expect(scene.output).toContain(
          '✗ root: Error: settings.json is locked',
        );
        expect(scene.output).toContain(
          '💥 MalfunctionError: 1 hook sync error — role hooks may be uninstalled',
        );
      });

      then('the root fault is aggregated, never thrown', () => {
        expect(scene.errors.map((e) => e.source)).toEqual(['sync:root']);
      });

      then('the sweep CONTINUES to the actors', () => {
        expect(scene.output).toContain('bee9012facade00');
      });
    });
  });

  given('[case6] the ROOT prune lands, then the ROOT sync THROWS', () => {
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
      then('the removals the prune wrote are still reported', () => {
        // the prune mutated configs on disk before the sync faulted, so a report of 0 would
        // state the opposite of what the process did
        expect(scene.output).toContain('2 orphans removed');
      });

      then('the sync fault is reported beside them', () => {
        expect(scene.output).toContain(
          '✗ root: Error: settings.json is locked',
        );
        expect(scene.errors.map((e) => e.source)).toEqual(['sync:root']);
      });
    });
  });

  /**
   * .what = an actor enrolled WITHOUT a linked role never receives that role's hooks
   * .why = its clones read this brain dir at user scope, so a foreign Stop hook fires inside
   *   them — measured 2026-10-05: a `reviewer`-only actor carried the driver's
   *   `route.drive --when hook.onStop`, so its reviewer clone looped and never ended its turn
   */
  given('[case7] an ACTOR enrolled without one of the linked roles', () => {
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'sync-hooks-actor-roleset' });
      mockGetLinkedRolesWithHooks.mockResolvedValue({
        roles: [
          { slug: 'reviewer', repo: 'bhrain' },
          { slug: 'driver', repo: 'bhrain' },
        ],
        errors: [],
      });
      mockPruneOrphanedRoleHooksFromAllBrains.mockResolvedValue({
        removed: [],
      });
      mockSyncAllRoleHooksIntoEachBrainRepl.mockResolvedValue({
        applied: [],
        errors: [],
      });
      setOneActorOndisk({
        dir,
        hash: 'b0b1234cafef00d',
        brain: 'claude-code',
        roles: ['reviewer'],
      });

      const context = new ContextCli({ cwd: dir, gitroot: dir });
      await captureConsoleOutput(() => syncHooksForLinkedRoles({}, context));

      // call 0 = the root target, call 1 = the actor target
      const syncCalls = mockSyncAllRoleHooksIntoEachBrainRepl.mock.calls;
      const pruneCalls = mockPruneOrphanedRoleHooksFromAllBrains.mock.calls;
      return {
        rootRoles: syncCalls[0]?.[0].roles,
        actorRoles: syncCalls[1]?.[0].roles,
        actorAuthors: [...(pruneCalls[1]?.[0].authorsDesired ?? [])],
      };
    });

    when('[t0] sync is executed', () => {
      then('the root still receives every linked role', () => {
        expect(scene.rootRoles).toEqual([
          { slug: 'reviewer', repo: 'bhrain' },
          { slug: 'driver', repo: 'bhrain' },
        ]);
      });

      then('the actor receives only the roles it was enrolled with', () => {
        expect(scene.actorRoles).toEqual([
          { slug: 'reviewer', repo: 'bhrain' },
        ]);
      });

      then('the actor prune treats the absent role as an orphan', () => {
        // so a driver hook a prior sync wrote into this actor is removed, not kept
        expect(scene.actorAuthors).toEqual(['repo=bhrain/role=reviewer']);
      });
    });
  });
});
