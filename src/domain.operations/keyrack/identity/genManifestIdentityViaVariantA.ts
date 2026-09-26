import type { KeyrackUnlockAttribution } from '@src/infra/ssh/asUnlockPromptMessage';

import { genKeyrackManifestIdentityViaAgent } from './genKeyrackManifestIdentityViaAgent';
import { getOneEd25519SshKeyCandidate } from './getOneEd25519SshKeyCandidate';

/**
 * .what = re-derive the derive-not-store manifest identity K from the ephemeral
 *         sign-as-KDF path, when a passphrased ed25519 key is present to sign with
 * .why = the passphrased-ed25519 unlock path (vision q1): the ssh key signs the
 *        challenge, the signature seeds K, K decrypts the manifest — the native
 *        prompt once, zero reuse after
 *
 * .note = returns null when NO usable ed25519 key is present (no key, or only a
 *         wrong-type rsa/ecdsa key). the caller reaches here ONLY after the
 *         prompt-free pool already failed to decrypt — a legacy manifest is opened
 *         by its ssh recipient in that pool (age-cli), a passwordless key converts
 *         in-process there. so a null here means "no derive-not-store path fits" and
 *         the caller surfaces its own no-identity error. this is the derive-not-store
 *         replacement for the old sealed-K sidecar gate: the signal is no longer a
 *         stored file but simply "an ed25519 key exists to re-derive K with"
 * .note = derive-not-store has no stored secret to mismatch, so a wrong ed25519 key
 *         (rotation / one-of-several) does not fail with a bespoke wrap-key-mismatch
 *         — it derives a DIFFERENT K that the age library rejects as "no identity
 *         matched", which the shared trial-decrypt loop treats as a normal miss.
 *         the caller then surfaces its own no-identity error
 */
export const genManifestIdentityViaVariantA = async (input: {
  owner: string | null;
  prescribed: string[];
  askpassCandidates?: string[];
  attribution?: KeyrackUnlockAttribution | null;
}): Promise<string | null> => {
  // pick the ed25519 key to sign with: a prescribed prikey first, else the default.
  // no usable ed25519 key (none present, or only a wrong-type rsa/ecdsa) → no
  // derive-not-store path fits → null (fall through). a wrong-type key present is NOT a
  // hard fail here: the prompt-free pool has already been tried (a legacy ssh manifest
  // is opened there via age-cli), so a null lets the caller surface the right
  // no-identity error rather than a premature throw
  const key = getOneEd25519SshKeyCandidate({
    owner: input.owner,
    prescribed: input.prescribed,
  });
  if (!key) return null;

  // pre-prompt banner (vision day-in-the-life): announce what is about to happen
  // just before the ephemeral agent load pops the native passphrase dialog, so a
  // human is never left at a blank terminal a moment before a GUI dialog appears.
  // this is the ONE choke point every manifest-read command funnels through
  // (unlock, set, del, list, recipient, fill all reach here via getOne), so the
  // banner covers them all at once — no per-command banner to miss. printed to
  // stderr: it is a status notice, so stdout stays clean for --json (robot) reads.
  // the "(fresh prompt each unlock — by design)" tail is essential copy: the
  // ephemeral agent means a passphrase dialog pops on EVERY invocation (vision q5,
  // zero reuse), so a human prompted repeatedly in one session reads this as the
  // intended shape, not an unlock stuck in a retry loop (rule.forbid.surprises)
  console.error(
    `🔐 unlock ${input.owner ?? 'default'} identity · ephemeral agent, zero reuse (fresh prompt each unlock — by design)`,
  );

  // print the visual-match code to stderr, the SAME code the attributed dialog
  // shows, so the human confirms the dialog belongs to THIS command before they
  // type — a spoofed dialog cannot know a freshly-minted code (the confused-deputy
  // defense, rule.forbid.contextless-unlock-prompt). only when attribution is present
  // (a code was minted); a null attribution falls to the plain dialog, no code line
  if (input.attribution)
    console.error(
      `🔐 unlock code: ${input.attribution.code}   (confirm this matches the dialog before you type)`,
    );

  // re-derive K via the ephemeral agent + native prompt, and project its secret
  // identity (unlock decrypts WITH it). a cancelled prompt, a sign error, or an
  // absent askpass dialog surfaces loud (the dialog's install fix included) — never
  // masked as "no identity". a wrong ed25519 key derives a K the caller's
  // trial-decrypt then rejects as a normal miss (see .note above)
  const { identity } = await genKeyrackManifestIdentityViaAgent({
    owner: input.owner,
    keyPath: key.keyPath,
    pubkeyPath: key.pubkeyPath,
    askpassCandidates: input.askpassCandidates,
    attribution: input.attribution,
  });
  return identity;
};
