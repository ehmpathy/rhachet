import { asIsoTimeStamp } from 'iso-time';
import { genTempDir, given, then, useBeforeAll, useThen, when } from 'test-fns';
import { getUuid } from 'uuid-fns';

import { setupEnrollFixture } from '@/blackbox/.test/infra/enrollCloneHarness';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';

import { mkdirSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { findsertActorOndisk } from '@src/domain.operations/actor/enrolled/findsertActorOndisk';
import { getActorOndiskDir } from '@src/domain.operations/actor/enrolled/getActorOndiskDir';
import { getBrainOndiskDir } from '@src/domain.operations/actor/enrolled/getBrainOndiskDir';
import { asClaudeProjectSlug } from '@src/domain.operations/clone/asClaudeProjectSlug';
import { genSampleCloneOndisk } from '@src/.test/assets/genSampleCloneOndisk';

/**
 * .what = the blackbox acceptance snapshot for `clone get`'s same-cwd-race
 *   degradation — a clone whose would-be transcript was QUARANTINED (two clones
 *   shared a cwd at spawn) reads an EMPTY history, and `get` EXPLAINS that empty
 *   with the shared-cwd advisory rather than a silent absence
 * .why =
 *   - the better-get feature promised "never a silent unexplained empty": when
 *     the ambiguous-refuse guard quarantines a clone's transcript, `get` must
 *     surface WHY the history is empty. the mechanism is clamped at the
 *     integration grain (genCloneHistoryLink writes the `.exids/<exid>.ambiguous`
 *     marker; getCloneOutput reads it into exidsAmbiguous), but the END-TO-END
 *     user-faced stdout+stderr was the one deferred snapshot gap — this closes it
 *   - DETERMINISTIC, not a flaky real race: we PLANT the quarantine marker on disk
 *     (exactly as the linker's refuse would), the same way clone.get-advisory
 *     plants an orphan symlink to provoke exidsUnreadable. no two live clones, no
 *     timing dependence — so the snapshot is stable (philosophy.verification-strictness)
 *
 * .note = the planted transcript sits in THIS clone's own transcript dir — its
 *   ACTOR's brain dir + spawn cwd — so the scoped ambiguous read counts it; a marker
 *   in a FOREIGN dir is excluded (the getCloneOutput integration `t1` clamps that
 *   half). the clone's history stays empty because a quarantined exid is excluded
 *   from the linker's eligible pool, so no history link is written
 *
 * .note = `CLAUDE_CONFIG_DIR` names a DECOY dir with no transcripts at all, so the
 *   read that still finds the planted one proves the clone scopes its ACTOR's brain
 *   dir rather than the parent env (define.brain-dir-repo-vs-actor)
 */
describe('rhx clone get same-cwd-race degradation (acceptance)', () => {
  given(
    '[case1] a clone whose only in-window transcript was quarantined as ambiguous',
    () => {
      const scene = useBeforeAll(async () => {
        const dir = genTempDir({ slug: 'clone-samecwd-race' });
        setupEnrollFixture({ dir });

        // a DECOY config dir the parent env names — a clone reads its ACTOR's brain
        // dir, never the parent env (define.brain-dir-repo-vs-actor), so a transcript
        // planted here must stay invisible; it is the negative control below
        const decoyConfigDir = join(dir, '.claude-config-decoy');

        // findsert the actor and render its brain dir FIRST — the real enroll order
        // (render the brain dir, THEN spawn the clone). this is idempotent and
        // converges on the SAME actor genSampleCloneOndisk findserts below (same
        // { brain, roles } → same hash), so it provisions no second actor
        const actor = findsertActorOndisk({
          repoPath: dir,
          brain: 'claude',
          roles: ['mechanic'],
          delta: null,
          reason: null,
          logEnrollment: false,
        });
        const brainDir = getBrainOndiskDir({
          actorDir: getActorOndiskDir({
            repoPath: actor.repoPath,
            hash: actor.hash,
          }),
        });
        const transcriptDir = join(
          brainDir,
          'projects',
          asClaudeProjectSlug({ cwd: actor.repoPath }),
        );
        mkdirSync(transcriptDir, { recursive: true });

        // the clone spawns AT-OR-AFTER its actor's brain dir was born, derived from
        // that dir's own birth time (ceiled past any sub-ms fraction, which
        // `Date.now()` truncates away). this is not a detail: `getCloneBrainDir`
        // falls back to `~/.claude` for a clone that PREDATES its actor's brain dir
        // (the D8 upgrade path), so a fixture that spawns first reads a different
        // transcript dir than the one it plants into — and the ambiguous marker
        // below would be scoped out in silence
        const spawnedAt = asIsoTimeStamp(
          new Date(Math.ceil(statSync(brainDir).birthtimeMs)).toISOString(),
        );
        const planted = genSampleCloneOndisk({
          repoPath: dir,
          brain: 'claude',
          roles: ['mechanic'],
          serial: '7f3a0b12-1c2d-4e3f-8a4b-5c6d7e8f9a0b',
          slug: null,
          socketEligible: false,
          spawnedAt,
        });

        // plant an in-window transcript in THIS clone's own transcript dir (the
        // brain + spawn-cwd claude writes to), then a `.exids/<exid>.ambiguous`
        // quarantine marker pointed at it — what the linker's ambiguous-refuse writes
        const exid = getUuid();
        const transcriptPath = join(transcriptDir, `${exid}.jsonl`);
        writeFileSync(
          transcriptPath,
          `${JSON.stringify({
            type: 'assistant',
            message: { content: [{ type: 'text', text: 'hidden reply' }] },
          })}\n`,
          'utf8',
        );

        const exidsDir = join(planted.actorsRoot, '.exids');
        mkdirSync(exidsDir, { recursive: true });
        symlinkSync(transcriptPath, join(exidsDir, `${exid}.ambiguous`));

        return { dir, serial: planted.serial, decoyConfigDir };
      });

      when(
        '[t0] `clone get --output json` reads the quarantined-empty history',
        () => {
          const run = useThen('exits 0', () =>
            invokeRhachetCliBinary({
              args: ['clone', 'get', `@:${scene.serial}`, '--output', 'json'],
              cwd: scene.dir,
              env: { CLAUDE_CONFIG_DIR: scene.decoyConfigDir },
              logOnError: false,
            }),
          );

          then(
            'the history is empty AND the cause is a STRUCTURED exidsAmbiguous field',
            () => {
              expect(run.status).toEqual(0);
              const parsed = JSON.parse(run.stdout) as {
                messages: unknown[];
                exidsAmbiguous: string[];
              };
              expect(parsed.messages).toEqual([]);
              expect(parsed.exidsAmbiguous.length).toEqual(1);
            },
          );

          then('no advisory prose leaks to a machine caller on stderr', () => {
            // the mode-gate: a json caller reads exidsAmbiguous off the body, so the
            // ⚠ english advisory must NOT appear on stderr (ungate the guard → red)
            expect(run.stderr).not.toContain('🟡');
            expect(run.stderr).not.toContain('shared a cwd');
          });

          then('the quarantined-empty json body shape is locked (machine contract)', () => {
            // pair the field asserts with a snapshot per rule.require.snapshots — the
            // exid inside exidsAmbiguous is a uuid asSnapshotSafe masks, so the body
            // (empty messages + the STRUCTURED exidsAmbiguous cause + total/truncated)
            // stays a stable machine shape a widened/renamed field surfaces against
            expect(asSnapshotSafe(run.stdout)).toMatchSnapshot();
          });
        },
      );

      when('[t1] `clone get` (tree, the default) reads the same history', () => {
        const run = useThen('exits 0', () =>
          invokeRhachetCliBinary({
            args: ['clone', 'get', `@:${scene.serial}`],
            cwd: scene.dir,
            env: { CLAUDE_CONFIG_DIR: scene.decoyConfigDir },
            logOnError: false,
          }),
        );

        then('a human DOES get the shared-cwd advisory on stderr', () => {
          // the empty history is EXPLAINED, never a silent empty — the fix half of
          // the better-get promise. the tree keeps the advisory (a SPLIT, not a
          // removal — the json arm above proves the machine gets a field instead)
          expect(run.status).toEqual(0);
          expect(run.stderr).toContain('🟡');
          expect(run.stderr).toContain('shared a cwd');
        });

        then('the exact advisory text matches the snapshot', () => {
          // the .toContain asserts prove the advisory FIRES; this pins the FULL
          // human-faced line (the cause + the per-worktree fix) so a drift in the
          // text surfaces in review (rule.require.snapshots)
          const advisoryLine = run.stderr
            .split('\n')
            .find((line) => line.includes('🟡'));
          expect(advisoryLine).toMatchSnapshot();
        });
      });
    },
  );
});
