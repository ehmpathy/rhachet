import { genTempDir, given, then, useBeforeAll, useThen, when } from 'test-fns';

import { setupEnrollFixture } from '@/blackbox/.test/infra/enrollCloneHarness';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';

import { mkdirSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';

import { getCloneHistoryDir } from '@src/domain.operations/clone/getCloneHistoryDir';
import { genSampleCloneOnDisk } from '@src/.test/assets/genSampleCloneOnDisk';

/**
 * .what = the mode-gate clamp for `clone get`'s stderr advisories — a `--output
 *   json` caller must get the fact as a STRUCTURED field on the json body, never
 *   as unconditional english prose on stderr it has no contract to parse
 * .why =
 *   - every invokeEnroll advisory (breadcrumb / accrual) is
 *     `mode === 'tree' &&` gated; `clone get`'s two advisories broke that
 *     documented convention (i026 r011 blocker) — this clamps the fix
 *   - an orphan `history/<exid>.jsonl` symlink (a moved/reclaimed transcript)
 *     populates `exidsUnreadable`, the one advisory condition provokable on disk
 *     without the deferred two-clone same-cwd race
 *
 * .note = DOGFOOD: drop the `mode === 'tree' &&` guard on the exidsUnreadable
 *   advisory in invokeCloneGet.ts and the json case's `stderr NOT-contains ⚠`
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
      const planted = genSampleCloneOnDisk({
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
        expect(run.stderr).not.toContain('⚠');
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

      then('a human DOES get the ⚠ advisory on stderr', () => {
        // the mode-gate is a SPLIT, not a removal — the human tree view keeps the
        // advisory, so this proves the fix did not merely delete the warn
        expect(run.status).toEqual(0);
        expect(run.stderr).toContain('⚠');
        expect(run.stderr).toContain('could not be read');
      });

      then('the exact advisory text matches the snapshot', () => {
        // the .toContain asserts prove the advisory FIRES; this pins the FULL
        // human-faced line (count + cause + the moved-transcript note) so a drift
        // in the text surfaces in review (rule.require.snapshots). the planted
        // fixture is one vanished episode, so the count is a stable "1"
        const advisoryLine = run.stderr
          .split('\n')
          .find((line) => line.includes('⚠'));
        expect(advisoryLine).toMatchSnapshot();
      });
    });
  });
});
