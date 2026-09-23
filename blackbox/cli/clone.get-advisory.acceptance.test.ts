import { genTempDir, given, then, useBeforeAll, useThen, when } from 'test-fns';

import { setupEnrollFixture } from '@/blackbox/.test/infra/enrollCloneHarness';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';

import { mkdirSync, symlinkSync, utimesSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { getCloneHistoryDir } from '@src/domain.operations/clone/getCloneHistoryDir';
import { genSampleCloneOndisk } from '@src/.test/assets/genSampleCloneOndisk';

/**
 * .what = the mode-gate clamp for `clone get`'s stderr advisories — a `--output
 *   json` caller must get the fact as a STRUCTURED field on the json body, never
 *   as unconditional english prose on stderr it has no contract to parse
 * .why =
 *   - every invokeEnroll advisory (breadcrumb / accrual) is
 *     `mode === 'tree' &&` gated; `clone get`'s two advisories broke that
 *     documented convention — this clamps the fix
 *   - an orphan `history/<exid>.jsonl` symlink (a moved/reclaimed transcript)
 *     populates `exidsUnreadable`, the one advisory condition provokable on disk
 *     without the deferred two-clone same-cwd race
 *
 * .note = DOGFOOD: drop the `mode === 'tree' &&` guard on the exidsUnreadable
 *   advisory in invokeCloneGet.ts and the json case's `stderr NOT-contains 🟡`
 *   assertion goes red — the prose leaks to a machine caller (per
 *   rule.require.clamp-edge-cases; verified 2026-08-11)
 */
describe('rhx clone get advisory mode-gate (acceptance)', () => {
  given('[case1] a clone whose only linked episode is a vanished transcript', () => {
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'clone-get-advisory' });
      setupEnrollFixture({ dir });

      // provision one real actor + clone on disk (the reach index too), then plant
      // an orphan history symlink so getCloneOutput reports exidsUnreadable
      const planted = genSampleCloneOndisk({
        repoPath: dir,
        serial: '3f9c0b12-7a4e-4c1d-9e2f-0a1b2c3d4e5f',
        slug: null,
        socketEligible: false,
      });
      const historyDir = getCloneHistoryDir({ cloneDir: planted.cloneDir });
      mkdirSync(historyDir, { recursive: true });
      symlinkSync(
        join(planted.repoPath, 'no-such-transcript.jsonl'),
        join(historyDir, 'gone-exid.jsonl'),
      );

      return { dir, serial: planted.serial };
    });

    when('[t0] `clone get --output json` reads the empty-but-unreadable history', () => {
      const run = useThen('exits 0', () =>
        invokeRhachetCliBinary({
          args: ['clone', 'get', `@:${scene.serial}`, '--output', 'json'],
          cwd: scene.dir,
          logOnError: false,
        }),
      );

      then('the fact is a STRUCTURED json field, not stderr prose', () => {
        expect(run.status).toEqual(0);
        const parsed = JSON.parse(run.stdout) as { exidsUnreadable: string[] };
        expect(parsed.exidsUnreadable).toContain('gone-exid');
      });

      then('no advisory prose leaks to a machine caller on stderr', () => {
        // the gate: a json caller reads exidsUnreadable off the body above, so the
        // ⚠ english advisory must NOT appear on stderr (ungate the guard → red)
        expect(run.stderr).not.toContain('🟡');
        expect(run.stderr).not.toContain('could not be read');
      });

      then('the unreadable-episode json body shape is locked (machine contract)', () => {
        // the json twin of the human advisory snapshotted at t1 — the machine body
        // carries the fact as a STRUCTURED `exidsUnreadable` field (empty messages,
        // the vanished exid named), so a drifted machine shape surfaces in review
        // (rule.require.contract-snapshot-exhaustiveness). the body is token-free
        // (no serial/socket), so it locks the exact machine contract
        expect(asSnapshotSafe(run.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] `clone get` (tree, the default) reads the same history', () => {
      const run = useThen('exits 0', () =>
        invokeRhachetCliBinary({
          args: ['clone', 'get', `@:${scene.serial}`],
          cwd: scene.dir,
          logOnError: false,
        }),
      );

      then('a human DOES get the 🟡 advisory on stderr', () => {
        // the mode-gate is a SPLIT, not a removal — the human tree view keeps the
        // advisory, so this proves the fix did not merely delete the warn
        expect(run.status).toEqual(0);
        expect(run.stderr).toContain('🟡');
        expect(run.stderr).toContain('could not be read');
      });

      then('the exact advisory text matches the snapshot', () => {
        // the .toContain asserts prove the advisory FIRES; this pins the FULL
        // human-faced line (count + cause + the moved-transcript note) so a drift
        // in the text surfaces in review (rule.require.snapshots). the planted
        // fixture is one vanished episode, so the count is a stable "1"
        const advisoryLine = run.stderr
          .split('\n')
          .find((line) => line.includes('🟡'));
        expect(advisoryLine).toMatchSnapshot();
      });
    });
  });

  /**
   * 🚨 .what = the FOREIGN-transcript advisory — a linked transcript that predates the
   *   clone's spawn, so it cannot hold the clone's output and is refused at read time
   *
   * 🔴 .why it needs its own case = `exidsForeign` is `[]` in every extant snapshot in
   *   this repo, so its NON-EMPTY render had no clamp at all — neither the json field
   *   nor the human advisory line. and its advisory differs from the two above on the
   *   one axis that matters: it fires WHATEVER the message count, where
   *   `exidsAmbiguous` fires only on an empty read. so a copy of the `&& messages
   *   .length === 0` gate onto this branch would suppress the warn on exactly the
   *   render that needs it — a clone whose history was SILENTLY NARROWED, which reads
   *   to a human as a complete history.
   *
   * 🚨 .the measured defect it guards = 2026-09-16, a clone linked its enroller's live
   *   session and `get` rendered the enroller's own messages under `🎧` — heard from
   *   the clone. so the fact this advisory reports is a provenance lie, and a silent
   *   one (`getCloneOutput`'s own docblock records it).
   *
   * 🚨 .why the fixture carries TWO episodes = the property above — that this advisory
   *   fires whatever the message count — is only reachable when `messages` is
   *   NON-EMPTY. a one-episode fixture (the foreign one alone) renders zero messages,
   *   so a `messages.length === 0` gate would STILL fire and the clamp would not bite
   *   on the very axis it exists to hold. so an IN-WINDOW episode rides along: the read
   *   is a partial one, and the advisory is what tells a human that a history which
   *   reads as complete was in fact narrowed.
   *
   * .note = the provocation is a REAL transcript whose mtime is backdated past the
   *   spawn window. a birthtime cannot be set from node, and that is fine:
   *   `isTranscriptWithinSpawnWindow` treats a birthtime LATER than its mtime as
   *   untrustworthy and falls back to mtime — so the backdated mtime decides, which is
   *   the same branch a real reclaimed-inode transcript takes
   *
   * ⚠️ .the dogfood, with its reach stated (`rule.require.clamp-edge-cases`):
   *
   *   | mutation | this case |
   *   |---|---|
   *   | the `exidsForeign` advisory gains a `messages.length === 0` gate | 🔴 `[t1]` red — a narrowed history renders as complete |
   *   | the advisory loses its `mode === 'tree' &&` gate | 🔴 `[t0]` red — prose leaks to a machine caller |
   *   | the read-time foreign filter is dropped | 🔴 `[t0]` + `[t1]` red — the foreign turn renders as the clone's own |
   */
  given('[case2] a clone whose linked transcript PREDATES its own spawn', () => {
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'clone-get-foreign' });
      setupEnrollFixture({ dir });

      const planted = genSampleCloneOndisk({
        repoPath: dir,
        serial: '7c1d2e3f-4a5b-4c6d-8e9f-0a1b2c3d4e5f',
        slug: null,
        socketEligible: false,
      });

      const historyDir = getCloneHistoryDir({ cloneDir: planted.cloneDir });
      mkdirSync(historyDir, { recursive: true });

      const genEpisode = (episode: {
        exid: string;
        text: string;
        mtimeSec: number;
      }): void => {
        const transcriptPath = join(planted.repoPath, `${episode.exid}.jsonl`);
        writeFileSync(
          transcriptPath,
          `${JSON.stringify({
            type: 'assistant',
            message: { content: [{ type: 'text', text: episode.text }] },
          })}\n`,
          'utf8',
        );
        utimesSync(transcriptPath, episode.mtimeSec, episode.mtimeSec);
        symlinkSync(transcriptPath, join(historyDir, `${episode.exid}.jsonl`));
      };

      const nowSec = Math.floor(Date.now() / 1000);

      // the clone's OWN episode — in window, so it renders. it is what makes the read
      // a PARTIAL one rather than an empty one, which is the axis [t1] holds
      genEpisode({
        exid: 'own-exid',
        text: 'A TURN THIS CLONE DID SPEAK',
        mtimeSec: nowSec,
      });

      // the foreign one: stamps a full hour back — far past
      // CLONE_SPAWN_WINDOW_TOLERANCE_MS, so no clock or fs-granularity skew can walk
      // it into the window. the shape of an enroller's session linked into a peer
      genEpisode({
        exid: 'foreign-exid',
        text: 'A TURN THIS CLONE NEVER SPOKE',
        mtimeSec: nowSec - 3600,
      });

      return { dir, serial: planted.serial };
    });

    when('[t0] `clone get --output json` reads the narrowed history', () => {
      const run = useThen('exits 0', () =>
        invokeRhachetCliBinary({
          args: ['clone', 'get', `@:${scene.serial}`, '--output', 'json'],
          cwd: scene.dir,
          logOnError: false,
        }),
      );

      then('the foreign exid is a STRUCTURED field, not stderr prose', () => {
        expect(run.status).toEqual(0);
        const parsed = JSON.parse(run.stdout) as { exidsForeign: string[] };
        expect(parsed.exidsForeign).toContain('foreign-exid');
      });

      then('🔴 the foreign turn is NOT rendered as this clone`s own', () => {
        // the provenance guarantee: a refused transcript is refused from the BODY too,
        // never merely annotated. a render that kept it would attribute another
        // session's words to this clone (the 2026-09-16 defect)
        expect(run.stdout).not.toContain('A TURN THIS CLONE NEVER SPOKE');
      });

      then('the clone`s OWN turn still renders — a PARTIAL read, not an empty one', () => {
        // ⚠️ the assert that keeps the filter honest in the other direction: a guard
        //   that refused every episode would also pass the check above, and would
        //   report a healthy clone as mute
        expect(run.stdout).toContain('A TURN THIS CLONE DID SPEAK');
      });

      then('no advisory prose leaks to a machine caller on stderr', () => {
        expect(run.stderr).not.toContain('🟡');
        expect(run.stderr).not.toContain('predate');
      });

      then('the foreign-episode json body shape is locked', () => {
        expect(asSnapshotSafe(run.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] `clone get` (tree, the default) reads the same history', () => {
      const run = useThen('exits 0', () =>
        invokeRhachetCliBinary({
          args: ['clone', 'get', `@:${scene.serial}`],
          cwd: scene.dir,
          logOnError: false,
        }),
      );

      then('🔴 a human gets the 🟡 advisory even on a NON-EMPTY read', () => {
        // the axis this case exists for: `exidsAmbiguous` warns only when the read came
        // back empty, and this one warns WHATEVER the count — because a narrowed
        // history is not an explanation for a thin read, it is a provenance report
        expect(run.status).toEqual(0);
        expect(run.stdout).toContain('A TURN THIS CLONE DID SPEAK');
        expect(run.stderr).toContain('🟡');
        expect(run.stderr).toContain('predate');
        expect(run.stderr).toContain('NOT shown');
      });

      then('the foreign turn is absent from the human render too', () => {
        expect(run.stdout).not.toContain('A TURN THIS CLONE NEVER SPOKE');
      });

      then('the exact advisory text matches the snapshot', () => {
        // the `.toContain` asserts prove it FIRES; this pins the whole human line —
        // the count, the cause, and the `NOT shown` claim a reader acts on
        const advisoryLine = run.stderr
          .split('\n')
          .find((line) => line.includes('🟡'));
        expect(advisoryLine).toMatchSnapshot();
      });
    });
  });
});
