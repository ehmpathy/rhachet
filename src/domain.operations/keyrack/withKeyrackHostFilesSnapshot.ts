import type { KeyrackHostManifest } from '@src/domain.objects/keyrack';
import { getOsSecureCredentialPath } from '@src/domain.operations/keyrack/adapters/vaults/os.secure/vaultAdapterOsSecure';
import { getKeyrackHostManifestPath } from '@src/infra/getKeyrackHostManifestPath';

import { copyFileSync, existsSync, readFileSync, unlinkSync } from 'node:fs';

/**
 * .what = true when two files hold byte-identical content
 * .why = the resume path needs to tell a COMMITTED prior mutation (manifest rewritten →
 *        live manifest differs from its backup) from a MID-FLIGHT one (manifest not yet
 *        rewritten → live manifest byte-equals its backup). the completion-marker write
 *        always changes the manifest PLAINTEXT (the recipients array is re-keyed), so the
 *        ciphertext necessarily differs — this holds on the plaintext delta alone, not on
 *        age's random ephemeral key. so a manifest that differs from its backup reliably
 *        means "the completion-marker write happened", never a false negative
 */
const isFileContentEqual = (input: { a: string; b: string }): boolean =>
  readFileSync(input.a).equals(readFileSync(input.b));

/**
 * .what = run a recipient-change mutation (re-key os.secure blobs + re-seal the manifest)
 *         under a snapshot-then-rollback so a mid-flow failure never desyncs the manifest
 *         and its os.secure credentials onto different recipients
 * .why = os.secure blobs seal to the SAME recipients as the host manifest
 *        (rule.require.os-secure-seals-to-host-manifest). ANY recipient change must re-key
 *        the manifest AND every blob as one no-desync operation — migrate (legacy → K) and
 *        `recipient del` (drop a recipient) both need it. the invariant forbids a re-key that
 *        mutates in place with no snapshot-then-rollback, so this HOF is the shared primitive
 *        both reach for instead of each hand-rolling (and drifting from) the mechanism
 *
 * .note = snapshot-then-rollback (the invariant's accepted single-writer mechanism): copy each
 *         present host file to a `.snapshot-bak` neighbor, run the mutation with the MANIFEST
 *         written LAST as the completion marker, and on any thrown failure restore every
 *         snapshotted file so the manifest and its credentials can never desync. a successful
 *         run removes the backups; a restored run removes them too — no `.snapshot-bak` litter
 * .note = the caller's `fn` MUST re-key the os.secure blobs FIRST and re-seal the manifest
 *         LAST, so a crash before the manifest write leaves the manifest on the old recipient
 *         and the restore (or a re-run) recovers cleanly
 * .note = resume-aware against a hard kill (SIGINT/SIGKILL/power-loss), not just a thrown
 *         error: a normal run always clears its backups in the finally, so a `.snapshot-bak`
 *         PRESENT at the start of a call can only mean a prior mutation was killed before it
 *         cleaned up — which strands the live files in a half-re-keyed state. so before a fresh
 *         snapshot, a pre-existent backup is treated as the authoritative pre-mutation state:
 *         restore the live file FROM it (never clobber it with today's half-mutated bytes),
 *         which returns the whole file set to the true original before the mutation re-runs
 */
export const withKeyrackHostFilesSnapshot = async <T>(
  input: {
    owner: string | null;
    manifest: KeyrackHostManifest;
  },
  fn: () => Promise<T>,
): Promise<T> => {
  // a leftover `.snapshot-bak` set means a prior mutation was hard-killed before its
  // finally could clean up. the MANIFEST is the completion marker — `fn` writes it LAST,
  // and age ciphertext is never byte-identical across two writes — so the live manifest
  // BYTE-DIFFERS from its backup IFF the prior mutation already committed. that one bit
  // tells a committed-but-uncleaned kill (the new state is good: discard the stale
  // backups, never revert) from a mid-flight kill (the live files are half-re-keyed:
  // restore the true pre-mutation state from the backups). without it, a kill in the
  // post-commit / pre-cleanup gap would silently REVERT a completed re-key back to the
  // old recipients — a data hazard in the exact primitive built to prevent desync
  const manifestPath = getKeyrackHostManifestPath({ owner: input.owner });
  const manifestBackupPath = `${manifestPath}.snapshot-bak`;
  const priorKillDetected = existsSync(manifestBackupPath);
  const priorMutationCommitted =
    priorKillDetected &&
    existsSync(manifestPath) &&
    !isFileContentEqual({ a: manifestPath, b: manifestBackupPath });

  // snapshot every present host file (manifest + each os.secure blob) before the mutation
  const snapshot = getKeyrackHostFilePaths(input)
    .filter((livePath) => existsSync(livePath))
    .map((livePath) => {
      const backupPath = `${livePath}.snapshot-bak`;

      // no prior backup → fresh snapshot of the live file (the normal path)
      if (!existsSync(backupPath)) {
        copyFileSync(livePath, backupPath);
        return { livePath, backupPath };
      }

      // a backup already on disk = a prior mutation was hard-killed before cleanup.
      // treat it as STALE (re-snapshot the good live state, never revert) when either:
      //   - the prior mutation committed (manifest already rewritten to the new state), or
      //   - the manifest backup is already gone (cleanup got past the marker), which also
      //     means the prior mutation had committed — so a remaining blob backup is litter
      // else the prior mutation was mid-flight → the backup is the true pre-mutation
      // state → restore the live file FROM it (recover the pre-mutation bytes)
      if (priorMutationCommitted || !priorKillDetected)
        copyFileSync(livePath, backupPath);
      else copyFileSync(backupPath, livePath);

      return { livePath, backupPath };
    });

  // run the mutation; restore the snapshot on any thrown failure so no file desyncs.
  // `rollbackIncomplete` gates the finally cleanup: a restore that FAILS must not then
  // have its own backup removed, or the one recovery artifact is lost and the live file
  // is stranded half-mutated with no resume trail — the exact hazard this primitive
  // exists to prevent (rule.require.os-secure-seals-to-host-manifest)
  let rollbackIncomplete = false;
  try {
    return await fn();
  } catch (error) {
    // restore each snapshotted file best-effort, then ALWAYS re-throw the original
    // error. each restore is guarded on its own so a fault on one file cannot abort
    // the rest, and — critically — a restore fault must NEVER hide the caller's
    // original error, which is the reason rollback happened at all
    // (rule.forbid.failhide; mirrors the finally block and getOneAgentSignature)
    for (const { livePath, backupPath } of snapshot) {
      try {
        if (existsSync(backupPath)) copyFileSync(backupPath, livePath);
      } catch {
        // a restore fault means this live file may be stranded half-mutated. mark the
        // rollback incomplete so the finally PRESERVES every backup — never removes the
        // one artifact the resume path needs to recover next run
        rollbackIncomplete = true;
      }
    }

    // surface the incomplete rollback but keep the caller's original error intact: the
    // backups stay on disk and the next unlock's resume path restores from them. a bare
    // notice to stderr keeps stdout clean and does not swallow the error thrown below
    if (rollbackIncomplete)
      console.error(
        '⛈️  keyrack rollback incomplete — a file could not be restored; its .snapshot-bak backup is preserved and the next unlock will recover from it',
      );

    throw error;
  } finally {
    // best-effort cleanup — but ONLY when the rollback was complete. if ANY restore
    // failed, PRESERVE every backup so the resume path can recover on the next run (the
    // whole point of this primitive); a remove here would destroy the recovery artifact.
    // a cleanup fault must NEVER hide the caller's original error (rule.forbid.failhide);
    // mirrors getOneAgentSignature's finally block
    if (!rollbackIncomplete)
      try {
        cleanupSnapshot({ manifestBackupPath, snapshot });
      } catch {
        // ignore cleanup errors
      }
  }
};

/**
 * .what = the on-disk host files a recipient change mutates — the manifest and every
 *         os.secure blob (os.direct is plaintext, sealed to no recipient, never touched)
 * .why = the snapshot + restore must range over exactly this set so a file mutated but not
 *        snapshotted (or vice versa) cannot become the desync the invariant forbids
 */
const getKeyrackHostFilePaths = (input: {
  owner: string | null;
  manifest: KeyrackHostManifest;
}): string[] => {
  const manifestPath = getKeyrackHostManifestPath({ owner: input.owner });
  const osSecurePaths = Object.values(input.manifest.hosts)
    .filter((host) => host.vault === 'os.secure')
    .map((host) =>
      getOsSecureCredentialPath({ slug: host.slug, owner: input.owner }),
    );
  return [manifestPath, ...osSecurePaths];
};

/**
 * .what = remove the `.snapshot-bak` neighbors once they are no longer needed
 * .why = a successful mutation (or a completed restore) leaves no backup litter behind
 *
 * .note = the MANIFEST backup is removed LAST — the mirror of `fn` writing the manifest
 *         last. it is the commit marker for teardown too: while it survives, the resume
 *         path can still read "did the prior mutation commit?" from the live-vs-backup
 *         manifest diff. so a kill mid-cleanup leaves the marker until every blob backup
 *         is gone, and the resume path never mistakes a committed teardown for a mid-flight
 *         one. the sole caller runs this in a guarded finally, so a failed unlink can never
 *         fail the mutation nor mask the caller's original error (rule.forbid.failhide)
 */
const cleanupSnapshot = (input: {
  manifestBackupPath: string;
  snapshot: { livePath: string; backupPath: string }[];
}): void => {
  // blob backups first (every non-manifest backup), the manifest marker last
  for (const { backupPath } of input.snapshot)
    if (backupPath !== input.manifestBackupPath && existsSync(backupPath))
      unlinkSync(backupPath);
  if (existsSync(input.manifestBackupPath))
    unlinkSync(input.manifestBackupPath);
};
