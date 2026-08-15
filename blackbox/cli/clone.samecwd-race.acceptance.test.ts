import { asIsoTimeStamp } from 'iso-time';
import { genTempDir, given, then, useBeforeAll, useThen, when } from 'test-fns';
import { getUuid } from 'uuid-fns';

import { setupEnrollFixture } from '@/blackbox/.test/infra/enrollCloneHarness';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';

import { mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { asClaudeProjectSlug } from '@src/domain.operations/clone/asClaudeProjectSlug';
import { genSampleCloneOnDisk } from '@src/.test/assets/genSampleCloneOnDisk';

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
 * .note = the planted transcript sits in THIS clone's own transcript dir (its
 *   brain + spawn cwd), so the scoped ambiguous read counts it; a marker in a
 *   FOREIGN dir is excluded (the getCloneOutput integration `t1` clamps that half).
 *   the clone's history stays empty because a quarantined exid is excluded from the
 *   linker's eligible pool, so no history link is written
 */
describe('rhx clone get same-cwd-race degradation (acceptance)', () => {
  given(
    '[case1] a clone whose only in-window transcript was quarantined as ambiguous',
    () => {
      const scene = useBeforeAll(async () => {
        const dir = genTempDir({ slug: 'clone-samecwd-race' });
        setupEnrollFixture({ dir });

        // the config root the subprocess reads for claude transcripts — a temp dir
        // so the planted transcript is the brain's own on-disk session record
        const claudeConfigDir = join(dir, '.claude-config');

        // provision one real actor + clone on disk; spawnedAt a few seconds back so
        // a transcript written now lands AT-OR-AFTER spawn (the one-sided window)
        const spawnedAt = asIsoTimeStamp(
          new Date(Date.now() - 5_000).toISOString(),
        );
        const planted = genSampleCloneOnDisk({
          repoPath: dir,
          brain: 'claude',
          serial: '7f3a0b12-1c2d-4e3f-8a4b-5c6d7e8f9a0b',
          slug: null,
          socketEligible: false,
          spawnedAt,
        });

        // plant an in-window transcript in THIS clone's own transcript dir (the
        // brain + spawn-cwd claude writes to), then a `.exids/<exid>.ambiguous`
        // quarantine marker pointed at it — what the linker's ambiguous-refuse writes
        const exid = getUuid();
        const transcriptDir = join(
          claudeConfigDir,
          'projects',
          asClaudeProjectSlug({ cwd: planted.repoPath }),
        );
        mkdirSync(transcriptDir, { recursive: true });
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

        return { dir, serial: planted.serial, claudeConfigDir };
      });

      when(
        '[t0] `clone get --output json` reads the quarantined-empty history',
        () => {
          const run = useThen('exits 0', () =>
            invokeRhachetCliBinary({
              args: ['clone', 'get', `@:${scene.serial}`, '--output', 'json'],
              cwd: scene.dir,
              env: { CLAUDE_CONFIG_DIR: scene.claudeConfigDir },
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
            expect(run.stderr).not.toContain('⚠');
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
            env: { CLAUDE_CONFIG_DIR: scene.claudeConfigDir },
            logOnError: false,
          }),
        );

        then('a human DOES get the shared-cwd advisory on stderr', () => {
          // the empty history is EXPLAINED, never a silent empty — the fix half of
          // the better-get promise. the tree keeps the advisory (a SPLIT, not a
          // removal — the json arm above proves the machine gets a field instead)
          expect(run.status).toEqual(0);
          expect(run.stderr).toContain('⚠');
          expect(run.stderr).toContain('shared a cwd');
        });

        then('the exact advisory text matches the snapshot', () => {
          // the .toContain asserts prove the advisory FIRES; this pins the FULL
          // human-faced line (the cause + the per-worktree fix) so a drift in the
          // text surfaces in review (rule.require.snapshots)
          const advisoryLine = run.stderr
            .split('\n')
            .find((line) => line.includes('⚠'));
          expect(advisoryLine).toMatchSnapshot();
        });
      });
    },
  );
});
