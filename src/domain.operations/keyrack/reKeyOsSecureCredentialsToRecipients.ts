import { MalfunctionError } from 'helpful-errors';

import type {
  KeyrackHostManifest,
  KeyrackKeyRecipient,
} from '@src/domain.objects/keyrack';
import { getOsSecureCredentialPath } from '@src/domain.operations/keyrack/adapters/vaults/os.secure/vaultAdapterOsSecure';
import type { ContextKeyrack } from '@src/domain.operations/keyrack/genContextKeyrack';
import { setFileAtomic } from '@src/infra/filesystem/setFileAtomic';
import {
  decryptWithIdentity,
  encryptToRecipients,
} from '@src/infra/ssh/ageRecipientCrypto';

import { existsSync, readFileSync, statSync } from 'node:fs';

/**
 * .what = re-encrypt every os.secure credential blob from the session identity to a
 *         new recipient — the owned-vault half of a manifest-recipient change
 * .why = os.secure blobs are each sealed to the SAME recipients as the host manifest
 *        (vaultAdapterOsSecure.set → encryptToRecipients(hostManifest.recipients)). so
 *        a migration that re-seals the manifest to a new recipient K MUST re-seal every
 *        os.secure blob to K in the same session — else the next fresh unlock derives
 *        K, opens the manifest, then fails on the first credential still on the OLD
 *        recipient (`no identity matched`). this is the invariant in
 *        rule.require.os-secure-seals-to-host-manifest, applied
 *
 * .note = os.direct blobs are PLAINTEXT json (vaultAdapterOsDirect), sealed to no
 *         recipient, so they are untouched here — only os.secure seals to recipients
 * .note = operates on the RAW ciphertext (decrypt→re-encrypt), never a get/set round-
 *         trip: get runs the mech's deliverForGet, which transforms the source into a
 *         usable secret and cannot reproduce the stored blob
 * .note = the session identity is fetched ONLY when there is at least one os.secure
 *         blob to re-key — a manifest with no os.secure host owes no identity, so a
 *         legacy manifest whose session identity would need an age-cli passphrase
 *         prompt (a passphrased-ed25519 legacy) is never forced through it needlessly
 * .note = CALLER CONTRACT: run this UNDER withKeyrackHostFilesSnapshot. this function
 *         owns NO rollback of its own — it is a per-slug decrypt→re-seal→write loop.
 *         the per-blob catch's hint states 'the change was rolled back, so your keyrack
 *         is unharmed'; that claim is true ONLY because the snapshot HOF restores every
 *         host file before the throw propagates. every extant caller (migrate, recipient
 *         set, recipient del) routes through that HOF. a direct caller that skips it
 *         would surface a hint that falsely claims safety — so do not call this bare
 */
export const reKeyOsSecureCredentialsToRecipients = async (
  input: {
    owner: string | null;
    /**
     * .what = the decrypted host manifest, read for its hosts map
     * .why = only hosts whose vault is os.secure hold a recipient-sealed blob to re-key
     */
    manifest: KeyrackHostManifest;
    /**
     * .what = the recipient SET each blob is re-sealed to after the change
     * .why = a blob must seal to the SAME recipients as the manifest after the change —
     *        migrate passes the single derived K; `recipient del` passes the rest of the
     *        set so the dropped recipient can no longer open the credentials
     *        (rule.require.os-secure-seals-to-host-manifest)
     */
    recipients: KeyrackKeyRecipient[];
  },
  context: ContextKeyrack,
): Promise<{ rekeyed: string[] }> => {
  const { owner, manifest, recipients } = input;

  // the os.secure slugs to re-key — every host whose vault seals to recipients
  const slugsOsSecure = Object.values(manifest.hosts)
    .filter((host) => host.vault === 'os.secure')
    .map((host) => host.slug);

  // no os.secure blob → no session identity needed, no re-key owed
  if (slugsOsSecure.length === 0) return { rekeyed: [] };

  // the SESSION identity that opened the manifest — it opens every os.secure blob too
  // (they seal to the same recipients), so it decrypts each blob before the re-key.
  // we are PAST the `slugsOsSecure.length === 0` guard, so real re-key work is owed
  // here — an absent session identity means we cannot decrypt the blobs we must
  // re-seal. a silent `return { rekeyed: [] }` would be a failhide: the caller then
  // persists the new manifest as if every credential was re-keyed, and the manifest
  // silently desyncs from its os.secure blobs onto different recipients (the exact
  // 2026-07-30 brick this whole primitive exists to prevent). so fail LOUD —
  // MalfunctionError (server-must-fix, exit 1), NOT an empty-success (rule.forbid.failhide)
  const identitySession = await context.identity.getOne({ for: 'manifest' });
  if (!identitySession)
    throw new MalfunctionError(
      'cannot re-key os.secure credentials — no session identity is available to decrypt them',
      {
        owner,
        slugsOsSecure,
        hint: 'the manifest unlock that reached this re-key must have produced a session identity; a null here means the identity context was not primed before the recipient change — this is an internal invariant break, not a user misconfiguration',
      },
    );

  // .note = deliberate mutation (rule.require.immutable-vars sanctioned exemption):
  // this loop performs sequential per-slug I/O (decrypt → re-encrypt → write) with an
  // early `continue` skip, so an immutable map/reduce build is not practical here.
  // rekeyed is a local accumulator, never shared, appended once per re-keyed blob
  const rekeyed: string[] = [];
  for (const slug of slugsOsSecure) {
    const path = getOsSecureCredentialPath({ slug, owner });

    // a manifest host with no blob on disk (declared but never filled) is a skip, not
    // a fault — there is no ciphertext to re-key, and the fill will seal to the new
    // recipient when it runs
    if (!existsSync(path)) continue;

    // decrypt the old blob with the session identity, re-seal to the new recipient set.
    // a raw age fault here (corrupt blob, or a blob already desynced onto a recipient the
    // session identity cannot open) must NOT bubble as an opaque age-library string — it
    // is re-authored as a keyrack error that NAMES the blob and the fix (rule.require.
    // errors-name-the-fix). the snapshot around this loop restores every host file before
    // this throw propagates, so the hint truthfully states the keyrack is unharmed
    const modePrior = statSync(path).mode & 0o777;
    try {
      const ciphertextOld = readFileSync(path, 'utf8');
      const source = await decryptWithIdentity({
        ciphertext: ciphertextOld,
        identity: identitySession,
        owner,
      });
      const ciphertextNew = await encryptToRecipients({
        plaintext: source,
        recipients,
      });
      // atomic write — a crash mid-re-key must never leave a torn blob beside a
      // whole manifest, which would brick the next unlock (rule.require.os-secure-
      // seals-to-host-manifest). preserve the blob's prior perms verbatim — B2 is
      // scoped to atomicity, not a perm change, so the re-key is byte-for-byte what a
      // plain overwrite was, minus the torn-write hazard
      setFileAtomic({ path, content: ciphertextNew, mode: modePrior });
    } catch (error) {
      throw new MalfunctionError(
        `could not re-key the os.secure credential '${slug}' to the new manifest recipient`,
        {
          slug,
          owner,
          path,
          causeMessage: error instanceof Error ? error.message : String(error),
          hint: `the change was rolled back, so your keyrack is unharmed; this blob is corrupt or sealed to a recipient the current identity cannot open — re-fill it via 'rhx keyrack fill${owner ? ` --owner ${owner}` : ''}'`,
        },
      );
    }
    rekeyed.push(slug);
  }

  return { rekeyed };
};
