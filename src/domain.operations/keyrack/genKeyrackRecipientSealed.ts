import { BadRequestError } from 'helpful-errors';

import { KeyrackKeyRecipient } from '@src/domain.objects/keyrack';
import { AGE_CLI_ABSENT_MARKER } from '@src/infra/ssh/ageCliAbsentMarker';
import { asAgeRecipientFromSshPubkey } from '@src/infra/ssh/asAgeRecipientFromSshPubkey';
import { asFidoUnsupportedKeyError } from '@src/infra/ssh/asFidoUnsupportedKeyError';
import { asSshKeyTypeFromPubkey } from '@src/infra/ssh/asSshKeyTypeFromPubkey';
import type { KeyrackUnlockAttribution } from '@src/infra/ssh/asUnlockPromptMessage';
import { getOneSshKeyUnlockPosture } from '@src/infra/ssh/getOneSshKeyUnlockPosture';
import { isAgeCliAvailable } from '@src/infra/ssh/isAgeCliAvailable';

import { genKeyrackManifestIdentityViaAgent } from './identity/genKeyrackManifestIdentityViaAgent';

/**
 * .what = pick the host-manifest recipient for an ssh key, by the key's cipher and
 *         type — the cipher-/type-aware init dispatch
 * .why = keeps initKeyrack a narrative: the three recipient paths (passwordless,
 *        passphrased-ed25519 derive-not-store, passphrased-non-ed25519 age-CLI) live
 *        behind one named call instead of a 78-line inline branch (orchestrator-as-narrative)
 *
 * .note = derive-not-store has NO stored secret — the passphrased-ed25519 path derives
 *         K's recipient from the ssh signature and returns only that recipient; the
 *         same signature re-derives K at unlock. so there is no wrappedK to persist
 *         and no `sealed` recipient flag (the old sidecar is gone)
 */
export const genKeyrackRecipientSealed = async (input: {
  owner: string | null;
  cipher: string;
  pubkeyContent: string;
  keyPath: string;
  pubkeyPath: string;
  label?: string;
  askpassCandidates?: string[];
  /**
   * .what = the CLI-computed prompt attribution (org/tree/env/reach/code), or null
   * .why = the passphrased-ed25519 init pops the SAME gnome dialog unlock does, so it
   *        renders the attributed prompt + visual-match code, never a bare
   *        `Enter passphrase for …:` (rule.forbid.contextless-unlock-prompt)
   */
  attribution?: KeyrackUnlockAttribution | null;
}): Promise<{
  recipient: KeyrackKeyRecipient;
}> => {
  // FIDO/hardware-token (sk-) key: reject at cause, BEFORE any recipient branch. its
  // private half stays on the token, so it can back NONE of the paths — the unlock
  // classifier (sshPrikeyToAgeIdentity) already guards this, and init MUST guard it
  // too or a passphrased sk- key sails into the raw-ssh branch below and seals a
  // manifest no code path can ever decrypt (a silent self-brick surfaced only as a
  // generic "no identity could decrypt" on first unlock). both classifiers read the
  // type via asSshKeyTypeFromPubkey and reject via the one asFidoUnsupportedKeyError
  const keyType = asSshKeyTypeFromPubkey({ pubkey: input.pubkeyContent });
  const posture = getOneSshKeyUnlockPosture({ cipher: input.cipher, keyType });
  if (posture === 'fido-unsupported')
    throw asFidoUnsupportedKeyError({
      cipher: input.cipher,
      keyType,
      keyPath: input.keyPath,
    });

  // passwordless key: convert to native age recipient (npm library path)
  if (posture === 'passwordless') {
    const ageRecipient = asAgeRecipientFromSshPubkey({
      pubkey: input.pubkeyContent,
    });
    return {
      recipient: new KeyrackKeyRecipient({
        mech: 'age',
        pubkey: ageRecipient,
        label: input.label ?? 'default',
        addedAt: new Date().toISOString(),
      }),
    };
  }

  // passphrased ed25519 (vision q4): derive-not-store — derive K's recipient from
  // the ssh signature and encrypt the manifest to it. the same signature re-derives
  // K at unlock, so no secret is stored. the passphrase prompt is the native gnome
  // dialog (getOneAskpassDialog).
  //
  // scope: this is the Linux-desktop path by design (vision q2 mandates the
  // Wayland-native gnome dialog for keylogger safety). v1 targets that desktop
  // only. on a platform without the gnome dialog (e.g. macOS — explicitly out of
  // v1 scope), getOneAskpassDialog fails fast with a ConstraintError whose fix is
  // PLATFORM-AWARE: a package install on Linux, the KEYRACK_ASKPASS seam off it
  // (never a dead `apt` line on macOS). a deliberate fail-fast-with-guidance, NOT
  // a silent tty fallback and NOT a degrade to the age binary. a non-gnome
  // desktop is a documented follow-on, not a v1 gap.
  if (posture === 'passphrased-ed25519') {
    // announce the derive just before the ephemeral agent load pops the native
    // dialog (init-side banner; the unlock side has its own in genManifestIdentityViaVariantA)
    console.error(`🔐 initialize ${input.owner ?? 'default'} identity`);
    // print the visual-match code so the human can confirm the init dialog belongs to
    // THIS command before they type (rule.forbid.contextless-unlock-prompt); null when
    // a non-cli caller drove init. stderr — a status notice, keeps stdout clean
    if (input.attribution)
      console.error(
        `🔐 unlock code: ${input.attribution.code}   (confirm this matches the dialog before you type)`,
      );
    const { recipient: recipientK } = await genKeyrackManifestIdentityViaAgent({
      owner: input.owner,
      keyPath: input.keyPath,
      pubkeyPath: input.pubkeyPath,
      askpassCandidates: input.askpassCandidates,
      attribution: input.attribution,
    });
    return {
      recipient: new KeyrackKeyRecipient({
        mech: 'age',
        pubkey: recipientK,
        label: input.label ?? 'default',
        addedAt: new Date().toISOString(),
      }),
    };
  }

  // passphrased non-ed25519: only rsa is serviceable. age accepts ONLY ssh-rsa +
  // ssh-ed25519 recipients (never ecdsa/dsa), so an ecdsa/dsa key sealed to a raw
  // `ssh-ecdsa`/`ssh-dss` recipient would crash inside `age -e -r <pubkey>` with a
  // raw exec throw (exit 1, malfunction) at seal time — a self-brick that violates
  // the feature's pit-of-success (FIDO/headless/askpass-absent all fail loud with a
  // named fix). reject at cause with a caller-fixable BadRequestError (exit 2) that
  // names a key keyrack CAN serve — the same one-error shape as asFidoUnsupportedKeyError
  if (keyType !== 'ssh-rsa')
    throw new BadRequestError(
      `🔐 passphrase-protected ${keyType} key — keyrack cannot serve it.
   ├─ why: the \`age\` encryption backend accepts only ssh-rsa and ssh-ed25519
   │       keys, never ecdsa/dsa
   └─ fix: init the keyrack with a key keyrack can unlock — an ed25519 key
           (passphrased is fine — the native dialog unlocks it), an rsa key, or
           a passphrase-less key. then retry:
           rhx keyrack init --prikey <path-to-that-key>`,
      { cipher: input.cipher, keyType, keyPath: input.keyPath },
    );

  // passphrased rsa: keep raw ssh pubkey (age CLI path)
  // requires age CLI for encrypt AND decrypt
  if (!isAgeCliAvailable())
    throw new BadRequestError(
      `🔐 your ssh key is passphrase-protected and not ed25519 (cipher: ${input.cipher}).
   ├─ why: keyrack shells to the \`age\` cli to encrypt/decrypt with it; age
   │       prompts for the passphrase on each invocation (age does not use
   │       ssh-agent)
   ├─ fix: ${AGE_CLI_ABSENT_MARKER}, then retry with \`rhx keyrack init\` —
   │       ├─ brew install age  # macos
   │       └─ apt install age   # ubuntu/debian
   └─ note: passphrase-less keys (-N "") do not need age installed;
            passphrased ed25519 keys use the native prompt, no age cli`,
      { cipher: input.cipher, keyPath: input.keyPath },
    );

  return {
    recipient: new KeyrackKeyRecipient({
      mech: 'ssh',
      pubkey: input.pubkeyContent,
      label: input.label ?? 'default',
      addedAt: new Date().toISOString(),
    }),
  };
};
