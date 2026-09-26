import { getError, given, then, useBeforeAll } from 'test-fns';

import { genMockKeyrackHostManifest } from '@src/.test/assets/genMockKeyrackHostManifest';
import { getOsSecureCredentialPath } from '@src/domain.operations/keyrack/adapters/vaults/os.secure/vaultAdapterOsSecure';
import { getKeyrackHostManifestPath } from '@src/infra/getKeyrackHostManifestPath';

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { withKeyrackHostFilesSnapshot } from './withKeyrackHostFilesSnapshot';

/**
 * .what = prove the shared snapshot-then-rollback HOF: on success the mutation sticks and
 *         no backup litter is left; on a thrown failure every host file (manifest +
 *         os.secure blob) is restored to its pre-mutation bytes so the two never desync
 * .why  = migrate + `recipient del` both re-key the manifest AND its os.secure blobs, and
 *         the invariant (rule.require.os-secure-seals-to-host-manifest) forbids a mid-flow
 *         failure that leaves them on different recipients. this pins the ROLLBACK branch
 *         directly — the safety mechanism that guards the 2026-07-30 brick — which the
 *         migrate/del suites exercise only on their happy paths
 *
 * .note = integration (real fs); HOME-isolated temp dir. the file contents are opaque
 *         markers ('OLD'/'NEW') — the HOF snapshots + restores bytes, indifferent to what
 *         they encode, so no real age crypto is needed to prove the branch
 */
describe('withKeyrackHostFilesSnapshot (no-desync rollback)', () => {
  const scene = useBeforeAll(async () => {
    const home = mkdtempSync(join(tmpdir(), 'kr-snap-'));
    const originalHome = process.env.HOME;
    process.env.HOME = home;

    const owner = 'ehmpath-snap';
    const slug = 'testorg.test.API_KEY';

    // a manifest object with one os.secure host — the HOF derives the file set from it
    const manifest = genMockKeyrackHostManifest({
      owner,
      hosts: { [slug]: { vault: 'os.secure' } },
    });

    const manifestPath = getKeyrackHostManifestPath({ owner });
    const blobPath = getOsSecureCredentialPath({ slug, owner });

    return { home, originalHome, owner, manifest, manifestPath, blobPath };
  });

  afterAll(() => {
    process.env.HOME = scene.originalHome;
  });

  const seedFiles = (): void => {
    mkdirSync(dirname(scene.manifestPath), { recursive: true });
    mkdirSync(dirname(scene.blobPath), { recursive: true });
    writeFileSync(scene.manifestPath, 'OLD-manifest', 'utf8');
    writeFileSync(scene.blobPath, 'OLD-blob', 'utf8');
  };

  given('[case1] the mutation succeeds', () => {
    const outcome = useBeforeAll(async () => {
      seedFiles();
      const result = await withKeyrackHostFilesSnapshot(
        { owner: scene.owner, manifest: scene.manifest },
        async () => {
          writeFileSync(scene.blobPath, 'NEW-blob', 'utf8');
          writeFileSync(scene.manifestPath, 'NEW-manifest', 'utf8');
          return 'done';
        },
      );
      return { result };
    });

    then('the HOF returns the fn result', () => {
      expect(outcome.result).toEqual('done');
    });

    then('the mutation sticks (both files hold the NEW bytes)', () => {
      expect(readFileSync(scene.manifestPath, 'utf8')).toEqual('NEW-manifest');
      expect(readFileSync(scene.blobPath, 'utf8')).toEqual('NEW-blob');
    });

    then('no .snapshot-bak litter is left behind', () => {
      const error = getError(() =>
        readFileSync(`${scene.manifestPath}.snapshot-bak`, 'utf8'),
      );
      expect(error).not.toBeNull();
    });
  });

  given(
    '[case3] a prior mutation was hard-killed MID-FLIGHT (a stale .snapshot-bak survives)',
    () => {
      // the crash-safety branch: a SIGINT/SIGKILL amid a prior re-key loop kills the
      // process before the finally can clean up, so a `.snapshot-bak` (the true
      // pre-mutation bytes) survives beside a HALF-re-keyed live file. the next call must
      // treat that backup as authoritative — restore the live file from it, never clobber
      // it with today's half-mutated bytes — else the one good backup is lost and rollback
      // to the true original becomes structurally impossible.
      //
      // KEY realism: the manifest is written LAST (the completion marker), so a mid-flight
      // kill leaves the manifest still on its OLD bytes (its write never happened) while a
      // blob is left half-re-keyed. the manifest live == its backup is exactly what marks
      // this kill as mid-flight (NOT committed) — see case4 for the committed twin
      const outcome = useBeforeAll(async () => {
        seedFiles();

        // simulate the aftermath of a hard-killed MID-FLIGHT run: stale backups hold the
        // legacy pre-mutation bytes; the manifest live is still OLD (its last-write never
        // ran), and a blob live is half-re-keyed
        writeFileSync(
          `${scene.manifestPath}.snapshot-bak`,
          'OLD-manifest',
          'utf8',
        );
        writeFileSync(`${scene.blobPath}.snapshot-bak`, 'OLD-blob', 'utf8');
        writeFileSync(scene.manifestPath, 'OLD-manifest', 'utf8');
        writeFileSync(scene.blobPath, 'HALF-blob', 'utf8');

        // capture what the mutation SEES at entry — it must be the restored legacy bytes,
        // not the half-re-keyed bytes the killed run left behind
        const seen: { manifest: string; blob: string } = {
          manifest: '',
          blob: '',
        };
        const result = await withKeyrackHostFilesSnapshot(
          { owner: scene.owner, manifest: scene.manifest },
          async () => {
            seen.manifest = readFileSync(scene.manifestPath, 'utf8');
            seen.blob = readFileSync(scene.blobPath, 'utf8');
            writeFileSync(scene.blobPath, 'NEW-blob', 'utf8');
            writeFileSync(scene.manifestPath, 'NEW-manifest', 'utf8');
            return 'done';
          },
        );
        return { result, seen };
      });

      then(
        'the mutation sees the restored legacy bytes, not the half-re-keyed bytes',
        () => {
          expect(outcome.seen.manifest).toEqual('OLD-manifest');
          expect(outcome.seen.blob).toEqual('OLD-blob');
        },
      );

      then('the fresh mutation then sticks over the recovered state', () => {
        expect(readFileSync(scene.manifestPath, 'utf8')).toEqual(
          'NEW-manifest',
        );
        expect(readFileSync(scene.blobPath, 'utf8')).toEqual('NEW-blob');
      });

      then('no .snapshot-bak litter is left behind', () => {
        const error = getError(() =>
          readFileSync(`${scene.manifestPath}.snapshot-bak`, 'utf8'),
        );
        expect(error).not.toBeNull();
      });
    },
  );

  given(
    '[case4] a prior mutation COMMITTED then was killed before backup cleanup',
    () => {
      // the B1 regression clamp (crash-resume must not revert completed work): a prior
      // mutation ran fn() to completion — every blob re-keyed, the manifest (written LAST)
      // rewritten to the NEW state — and was then hard-killed in the gap BEFORE the finally
      // deleted the backups. so a `.snapshot-bak` set survives beside live files that hold
      // the GOOD new state. the naive resume ("a backup exists → restore from it") would
      // silently REVERT the completed re-key back to the old recipients. the fix reads the
      // completion marker: the manifest live DIFFERS from its backup (it was rewritten),
      // so the prior mutation committed → the backups are stale litter → keep the new state.
      //
      // teeth: before the fix this test goes red (fn sees the reverted OLD bytes); after it,
      // green (fn sees the committed NEW bytes, never reverted)
      const outcome = useBeforeAll(async () => {
        seedFiles();

        // stale backups hold the pre-mutation bytes; the live files hold the COMMITTED new
        // state (manifest rewritten last → live manifest DIFFERS from its backup)
        writeFileSync(
          `${scene.manifestPath}.snapshot-bak`,
          'OLD-manifest',
          'utf8',
        );
        writeFileSync(`${scene.blobPath}.snapshot-bak`, 'OLD-blob', 'utf8');
        writeFileSync(scene.manifestPath, 'NEW-manifest', 'utf8');
        writeFileSync(scene.blobPath, 'NEW-blob', 'utf8');

        // capture what a fresh mutation SEES at entry — it must be the committed NEW bytes,
        // never the reverted OLD bytes the naive restore would have written
        const seen: { manifest: string; blob: string } = {
          manifest: '',
          blob: '',
        };
        const result = await withKeyrackHostFilesSnapshot(
          { owner: scene.owner, manifest: scene.manifest },
          async () => {
            seen.manifest = readFileSync(scene.manifestPath, 'utf8');
            seen.blob = readFileSync(scene.blobPath, 'utf8');
            return 'done';
          },
        );
        return { result, seen };
      });

      then(
        'the completed re-key is NOT reverted — fn sees the committed NEW bytes',
        () => {
          expect(outcome.seen.manifest).toEqual('NEW-manifest');
          expect(outcome.seen.blob).toEqual('NEW-blob');
        },
      );

      then('the live files still hold the committed NEW state', () => {
        expect(readFileSync(scene.manifestPath, 'utf8')).toEqual(
          'NEW-manifest',
        );
        expect(readFileSync(scene.blobPath, 'utf8')).toEqual('NEW-blob');
      });

      then('the stale .snapshot-bak litter is cleaned up', () => {
        const error = getError(() =>
          readFileSync(`${scene.manifestPath}.snapshot-bak`, 'utf8'),
        );
        expect(error).not.toBeNull();
      });
    },
  );

  given('[case2] the mutation throws mid-flow', () => {
    const outcome = useBeforeAll(async () => {
      seedFiles();
      const caught = await getError(
        withKeyrackHostFilesSnapshot(
          { owner: scene.owner, manifest: scene.manifest },
          async () => {
            // mutate BOTH files, then throw — the desync the rollback must undo
            writeFileSync(scene.blobPath, 'NEW-blob', 'utf8');
            writeFileSync(scene.manifestPath, 'NEW-manifest', 'utf8');
            throw new Error('boom mid re-key');
          },
        ),
      );
      return { caught };
    });

    then('the error is rethrown (never swallowed)', () => {
      expect(outcome.caught).not.toBeNull();
      expect(outcome.caught.message).toContain('boom mid re-key');
    });

    then('both files are restored to their pre-mutation bytes', () => {
      expect(readFileSync(scene.manifestPath, 'utf8')).toEqual('OLD-manifest');
      expect(readFileSync(scene.blobPath, 'utf8')).toEqual('OLD-blob');
    });

    then('no .snapshot-bak litter is left behind', () => {
      const error = getError(() =>
        readFileSync(`${scene.blobPath}.snapshot-bak`, 'utf8'),
      );
      expect(error).not.toBeNull();
    });
  });

  given(
    '[case5] a restore FAILS mid-rollback — the backups are PRESERVED for resume',
    () => {
      // the B1 clamp (r11 i046): if the mutation throws AND a restore also faults, the
      // old code STILL ran the finally's unconditional cleanup — so the one recovery
      // artifact (the .snapshot-bak) was deleted anyway, the live file was stranded
      // half-mutated, and the next run's resume path found no backup to restore from. the
      // fix marks the rollback incomplete and PRESERVES every backup, so the resume path
      // recovers on the next run (rule.require.os-secure-seals-to-host-manifest).
      //
      // teeth: force a restore fault that survives even a root test runner — turn the live
      // blob into a DIRECTORY, so the rollback copyFileSync(backup → live) throws EISDIR
      // (a perms-based 0400 would be bypassed by root). before the fix this goes red (the
      // backup is cleaned away); after it, green (the backup survives)
      const outcome = useBeforeAll(async () => {
        seedFiles();
        const caught = await getError(
          withKeyrackHostFilesSnapshot(
            { owner: scene.owner, manifest: scene.manifest },
            async () => {
              // half-re-key, then sabotage the live blob so its restore cannot succeed:
              // replace the file with a directory → copyFileSync(backup → live) EISDIR
              writeFileSync(scene.manifestPath, 'NEW-manifest', 'utf8');
              rmSync(scene.blobPath);
              mkdirSync(scene.blobPath);
              throw new Error('boom with an unrestorable blob');
            },
          ),
        );
        return {
          caught,
          blobBackupPresent: existsSync(`${scene.blobPath}.snapshot-bak`),
          manifestBackupPresent: existsSync(
            `${scene.manifestPath}.snapshot-bak`,
          ),
        };
      });

      then(
        'the original error is rethrown, never hidden by the restore fault',
        () => {
          expect(outcome.caught).not.toBeNull();
          expect(outcome.caught.message).toContain(
            'boom with an unrestorable blob',
          );
        },
      );

      then(
        'every .snapshot-bak backup is preserved for the resume path',
        () => {
          expect(outcome.blobBackupPresent).toEqual(true);
          expect(outcome.manifestBackupPresent).toEqual(true);
        },
      );
    },
  );
});
