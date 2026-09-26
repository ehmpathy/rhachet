import {
  KeyrackHostManifest,
  KeyrackKeyRecipient,
} from '@src/domain.objects/keyrack';
import type { ContextKeyrack } from '@src/domain.operations/keyrack/genContextKeyrack';
import { asAgeRecipientFromSshPubkey } from '@src/infra/ssh/asAgeRecipientFromSshPubkey';
import { asSshKeyCipher } from '@src/infra/ssh/asSshKeyCipher';
import { asSshKeyTypeFromPubkey } from '@src/infra/ssh/asSshKeyTypeFromPubkey';
import { getOneSshKeyUnlockPosture } from '@src/infra/ssh/getOneSshKeyUnlockPosture';
import { getOneSshPubkey } from '@src/infra/ssh/getOneSshPubkey';
import { isSameSshPubkey } from '@src/infra/ssh/isSameSshPubkey';

import { existsSync, readFileSync } from 'node:fs';
import { asInitKeyPaths } from './asInitKeyPaths';
import { genKeyrackManifestIdentityViaAgent } from './identity/genKeyrackManifestIdentityViaAgent';
import { getOneEd25519SshKeyCandidate } from './identity/getOneEd25519SshKeyCandidate';
import { setKeyrackManifestRecipientsSealed } from './setKeyrackManifestRecipientsSealed';

/**
 * .what = fix-forward a legacy host manifest to derive-not-store on unlock — re-seal
 *         the manifest AND every os.secure credential to the derived identity K, and
 *         drop the legacy ssh-derived recipient (vision d6 end-state, reached seamlessly)
 * .why  = a manifest made before this feature is sealed to an age1 recipient derived
 *         from the ssh PUBKEY, decrypted by the age-cli tty path — so a legacy user
 *         stays on the garbled `age -d` prompt forever, never the gnome dialog. init
 *         takes an idempotent early-return on a present manifest and never re-seals, so
 *         without this there is no path forward. the wisher chose fix-forward: the first
 *         post-upgrade unlock re-seals to K, every later unlock is the native dialog
 *
 * .note = accepted two-prompt first unlock (wisher-approved, 2026-08-30): the first
 *         post-upgrade unlock of a legacy manifest fires TWO native dialogs, by design —
 *           prompt 1 — the prompt-free identity pool trial-decrypts the legacy ssh-stanza
 *                      via `age -d -i`, which asks for the key passphrase
 *           prompt 2 — this migrate re-derives K (via the ephemeral agent) to re-seal the
 *                      manifest forward to derive-not-store
 *         every unlock AFTER that one migration is single-prompt (the native dialog). the
 *         two-prompt first unlock is a one-time cost the wisher accepts as totally fine.
 *         only the prompt-2 re-derive half is hermetically pinned (re-derive prompt count
 *         === 1); prompt 1 reads its passphrase from the tty (not SSH_ASKPASS), the
 *         accepted age-cli limit from i027
 * .note = HARDCUT (single user, no other devices, no long-term backcompat): the migrated
 *         manifest is sealed to K ONLY — every legacy recipient is dropped, not carried
 *         forward. there is no multi-device recipient to preserve
 * .note = os.secure invariant (rule.require.os-secure-seals-to-host-manifest): os.secure
 *         blobs are sealed to the SAME recipients as the manifest, so this re-keys every
 *         one to K in the same session — else the next fresh unlock derives K, opens the
 *         manifest, then fails on the first credential still on the old recipient (the
 *         2026-07-30 brick). os.direct is plaintext (not recipient-sealed) — never touched
 * .note = idempotent + prompt-free gate: a v0 legacy manifest is sealed to ONE of two
 *         pubkey-detectable recipients — the age1 recipient `asAgeRecipientFromSshPubkey(pubkey)`
 *         (a passphrased pubkey added via `recipient set`), OR a raw mech-'ssh' recipient
 *         that holds the ssh pubkey itself (the shape a PRE-feature init sealed to — the
 *         seamless-backcompat path). BOTH are computed from the PUBKEY alone (no passphrase,
 *         no prompt), so "already on K" is detected with no dialog; not either shape → no-op
 * .note = no-desync via snapshot-then-rollback (rule.require.os-secure-seals-to-host-
 *         manifest): the manifest + every os.secure blob are snapshotted first; the blobs
 *         are re-keyed, the manifest is re-sealed LAST as the completion marker; any thrown
 *         failure restores the snapshot so manifest and credentials never desync
 */
export const migrateKeyrackManifestToVariantA = async (
  input: {
    owner: string | null;
    /**
     * .what = the ALREADY-DECRYPTED host manifest to fix forward
     * .why = migration re-encrypts the same hosts to K; the plaintext comes from the
     *        unlock's own manifest read, so no second decrypt (or prompt) is needed here
     */
    manifest: KeyrackHostManifest;
    /**
     * .what = explicit ssh private key path (the unlock --prikey), else the default key
     * .why = K is derived from the signature THIS ssh key produces; the same key derived
     *        the same way init derives it, so a later unlock re-derives the same K
     */
    prikey?: string;
    /**
     * .what = override the gnome askpass dialog candidate paths
     * .why = the re-seal prompts the passphrased key via the dialog; tests inject a
     *        scripted stand-in, and a custom install path can be pointed at
     */
    askpassCandidates?: string[];
  },
  context: ContextKeyrack,
): Promise<{ migrated: boolean }> => {
  const { owner, manifest } = input;

  // derive the ssh key paths — the --prikey the human named, else the default key.
  // unlike init, an unfindable key is a SKIP not a throw: unlock already succeeded
  // via whatever identity decrypted the manifest, so migration is opportunistic
  const keyPaths = getMigrationKeyPaths({ prikey: input.prikey, owner });
  if (!keyPaths) return { migrated: false };

  // an absent key file cannot re-seal — the manifest was made on another machine or
  // with a key not on this host. skip, never throw (opportunistic stance)
  if (!existsSync(keyPaths.prikeyPath)) return { migrated: false };

  // migration targets exactly ONE legacy shape: the passphrased ed25519 key.
  // - a passwordless key already uses the npm-library age1 path (no prompt, no age
  //   binary) — its manifest is already the desired end-state, no fix owed
  // - a passphrased non-ed25519 key cannot back the deterministic sign-as-KDF derive
  //   (vision q4) — out of v1 scope, left on the retained age-cli fallback
  const cipher = asSshKeyCipher({
    keyContent: readFileSync(keyPaths.prikeyPath, 'utf8'),
  });

  const pubkeyContent = getOneSshPubkey({ keyPath: keyPaths.prikeyPath });
  const keyType = asSshKeyTypeFromPubkey({ pubkey: pubkeyContent });
  const posture = getOneSshKeyUnlockPosture({ cipher, keyType });
  if (posture !== 'passphrased-ed25519') return { migrated: false };

  // the prompt-free idempotency gate: a v0 legacy manifest for a passphrased ed25519
  // key comes in TWO shapes, both detectable with NO dialog (pubkey-only), so we know
  // "already on K" without a prompt. not either legacy shape → already migrated → no-op:
  //   1. pubkey-age1 — sealed to the age1 (X25519) recipient DERIVED from the pubkey
  //      (a passphrased pubkey added via `keyrack recipient set`)
  //   2. raw-ssh — a mech-'ssh' recipient whose pubkey IS the ssh pubkey (the shape a
  //      PRE-feature init sealed a passphrased ed25519 key to — the seamless-backcompat
  //      path). compared apart from the comment field (isSameSshPubkey), since the stored
  //      recipient pubkey + the on-disk pubkey can carry different comments for one key
  const legacyAge1Recipient = asAgeRecipientFromSshPubkey({
    pubkey: pubkeyContent,
  });
  const isLegacyAge1 = manifest.recipients.some(
    (r) => r.pubkey === legacyAge1Recipient,
  );
  const isLegacySsh = manifest.recipients.some(
    (r) =>
      r.mech === 'ssh' && isSameSshPubkey({ a: r.pubkey, b: pubkeyContent }),
  );
  if (!isLegacyAge1 && !isLegacySsh) return { migrated: false };

  // derive K's recipient via the ephemeral agent — opens the native gnome dialog once
  // (the new UX this whole upgrade is for). announce just before, so a human is never
  // left at a blank terminal a moment before the dialog appears (stderr — status notice)
  console.error(
    `⛵ upgrade ${owner ?? 'default'} identity to the ssh-agent unlock`,
  );

  // print the visual-match code so the human can confirm the re-derive dialog belongs
  // to THIS command before they type (rule.forbid.contextless-unlock-prompt). the CLI
  // computed it once and threaded it onto context; null when a non-cli caller drove the
  // migrate directly (a domain test). stderr — a status notice, keeps stdout clean
  if (context.promptAttribution)
    console.error(
      `🔐 unlock code: ${context.promptAttribution.code}   (confirm this matches the dialog before you type)`,
    );

  // the hardcut re-seals to K ONLY (wisher decision: single user, no multi-device
  // recipient to preserve), which is silent + correct for the common one-recipient
  // legacy manifest. but a manifest that grew a SECOND recipient via `recipient set` (a
  // teammate/backup key) would lose it here with no signal — so when more than the one
  // expected legacy recipient is present, NAME every dropped one + the re-add fix, so
  // the drop is visible, never silent (rule.require.errors-name-the-fix). the hardcut
  // still applies (K only); this only removes the silence, it does not preserve them
  if (manifest.recipients.length > 1)
    console.error(
      asDroppedRecipientsNotice({ recipients: manifest.recipients, owner }),
    );
  const { recipient: recipientK } = await genKeyrackManifestIdentityViaAgent({
    owner,
    keyPath: keyPaths.prikeyPath,
    pubkeyPath: keyPaths.pubkeyPath,
    askpassCandidates: input.askpassCandidates,
    attribution: context.promptAttribution ?? null,
  });

  // rebuild the manifest sealed to K ONLY (hardcut: drop every legacy recipient)
  const manifestMigrated = new KeyrackHostManifest({
    uri: manifest.uri,
    owner: manifest.owner,
    recipients: [
      new KeyrackKeyRecipient({
        mech: 'age',
        pubkey: recipientK,
        label: 'default',
        addedAt: new Date().toISOString(),
      }),
    ],
    hosts: manifest.hosts,
  });

  // persist the fix-forward as one atomic, no-desync operation (the invariant): re-key
  // every os.secure blob to K, then re-seal the manifest last as the completion marker —
  // so a crash before the manifest write leaves it on the legacy recipient and a re-run
  // recovers cleanly (rule.require.os-secure-seals-to-host-manifest; shared with set + del)
  await setKeyrackManifestRecipientsSealed(
    { owner, manifestBefore: manifest, manifestAfter: manifestMigrated },
    context,
  );

  return { migrated: true };
};

/**
 * .what = the stderr notice that names the recipients the hardcut drops, shown ONLY
 *         when a legacy manifest carries more than the single expected legacy recipient
 * .why  = the migrate hardcut re-seals to K only. that is silent + fine for the common
 *         one-recipient legacy manifest, but a manifest that grew a teammate/backup
 *         recipient via `recipient set` would lose it with no signal. this names every
 *         dropped recipient (label + a short pubkey fingerprint) and the re-add fix, so
 *         the human sees exactly what went away and how to restore it — the hardcut is
 *         unchanged, only its silence is removed (rule.require.errors-name-the-fix)
 */
const asDroppedRecipientsNotice = (input: {
  recipients: KeyrackKeyRecipient[];
  owner: string | null;
}): string => {
  // every recipient line is a `├─` branch; the `└─` fix line below is the terminator
  const recipientLines = input.recipients.map(
    (recipient) =>
      `   ├─ ${recipient.label} (${recipient.pubkey.slice(0, 24)}…)`,
  );
  return [
    `⚠️ this upgrade seals to the ssh-agent identity ONLY and drops ${input.recipients.length} prior recipient(s):`,
    ...recipientLines,
    `   └─ re-add any you still need after unlock: rhx keyrack recipient set${input.owner ? ` --owner ${input.owner}` : ''} ...`,
  ].join('\n');
};

/**
 * .what = derive the ssh key paths for the re-seal — the --prikey the human named,
 *         else the default ssh key — a null instead of a throw when none is found
 * .why = init's asInitKeyPaths throws a "no ed25519 key found" BadRequestError when no
 *        default key exists, which is right for init but WRONG here: migration is
 *        opportunistic and must never break an unlock that already succeeded. so an
 *        unfindable key is a null (a skip), never a throw
 *
 * .note = the --prikey path routes through asInitKeyPaths, which with an explicit path
 *         does NOT look up a default and so cannot throw the no-default error
 */
const getMigrationKeyPaths = (input: {
  prikey?: string;
  owner: string | null;
}): { prikeyPath: string; pubkeyPath: string } | null => {
  if (input.prikey) {
    const { prikeyPath, pubkeyPath } = asInitKeyPaths({
      pubkey: input.prikey,
      owner: input.owner,
    });
    return { prikeyPath, pubkeyPath };
  }

  // the default lookup uses the SHARED ed25519-filter picker (owner → prescribed →
  // standard), the SAME one Variant A's sign uses — so migration re-seals with the
  // SAME ed25519 key unlock re-derives K from AND, critically, looks PAST a non-ed25519
  // owner key to the ed25519 key further down the precedence. a hand-rolled "first
  // present candidate of any type" loop grabbed the owner key even when it was
  // rsa/ecdsa, failed the downstream ed25519 check on that ONE candidate, and returned
  // migrated:false forever — a silent, permanent stall on the old tty path (r11 i042
  // blocker 1; rule.require.solve-at-cause). a null (no ed25519 key) is a skip, never a
  // throw — migration must never break an unlock that already succeeds
  const candidate = getOneEd25519SshKeyCandidate({ owner: input.owner });
  if (!candidate) return null;
  return { prikeyPath: candidate.keyPath, pubkeyPath: candidate.pubkeyPath };
};
