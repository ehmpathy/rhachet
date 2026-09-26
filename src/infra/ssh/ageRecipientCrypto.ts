import * as age from 'age-encryption';
import { UnexpectedCodePathError } from 'helpful-errors';

import type { KeyrackKeyRecipient } from '@src/domain.objects/keyrack';
import { withPrivateTempDir } from '@src/infra/filesystem/withPrivateTempDir';
import {
  AgeIdentityMissError,
  isAgeIdentityMissMessage,
} from '@src/infra/ssh/AgeIdentityMissError';
import { asAgeIdentityFromEd25519Seed } from '@src/infra/ssh/asAgeIdentityFromEd25519Seed';
import { asDecryptedSshKeyCopy } from '@src/infra/ssh/asDecryptedSshKeyCopy';
import { asSshKeyCipher } from '@src/infra/ssh/asSshKeyCipher';
import { SSH_KEY_PATH_MARKER } from '@src/infra/ssh/asSshKeyPathMarker';
import { assertGraphicalDialogAvailable } from '@src/infra/ssh/assertGraphicalDialogAvailable';
import {
  asUnlockPromptMessage,
  type KeyrackUnlockAttribution,
} from '@src/infra/ssh/asUnlockPromptMessage';
import { genAskpassShim } from '@src/infra/ssh/genAskpassShim';
import { getOneAskpassDialog } from '@src/infra/ssh/getOneAskpassDialog';
import { SSH_EXEC_TIMEOUT_MS } from '@src/infra/ssh/sshExecTimeouts';

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * .what = encrypt plaintext to multiple age recipients
 * .why = enables multi-recipient manifest encryption
 *
 * .note = cipher-aware dispatch:
 *         - mech 'age' (age1... pubkey): npm library → X25519 stanza
 *         - mech 'ssh' (ssh-ed25519... pubkey): age CLI → ssh-ed25519 stanza
 * .note = returns ascii-armored ciphertext for readability
 */
export const encryptToRecipients = async (input: {
  plaintext: string;
  recipients: KeyrackKeyRecipient[];
}): Promise<string> => {
  // validate at least one recipient
  if (input.recipients.length === 0)
    throw new UnexpectedCodePathError('no recipients provided for encryption', {
      recipientCount: input.recipients.length,
    });

  // check if any recipient requires age CLI (mech: 'ssh')
  const hasSshRecipient = input.recipients.some((r) => r.mech === 'ssh');

  // if all recipients are native age (mech: 'age'), use npm library
  if (!hasSshRecipient) {
    const encrypter = new age.Encrypter();
    for (const recipient of input.recipients) {
      if (recipient.mech !== 'age')
        throw new UnexpectedCodePathError(
          `recipient mech '${recipient.mech}' not supported; use 'age' or 'ssh'`,
          { recipient },
        );
      encrypter.addRecipient(recipient.pubkey);
    }
    const ciphertext = await encrypter.encrypt(input.plaintext);
    return age.armor.encode(ciphertext);
  }

  // if any recipient is ssh, use age CLI for all (produces matched stanzas)
  return encryptWithAgeCLI({
    plaintext: input.plaintext,
    recipients: input.recipients,
  });
};

/**
 * .what = decrypt ciphertext with an age identity
 * .why = enables manifest decryption with recipient's private key
 *
 * .note = identity is the age secret key (AGE-SECRET-KEY-...)
 * .note = for passphrase-protected ssh keys (rsa/ecdsa): identity is SSH_KEY_PATH:$path
 *         and decryption shells out to the age CLI. age reads the key passphrase from
 *         the tty, so keyrack first strips the passphrase via the gnome dialog
 *         (asDecryptedSshKeyCopy) and hands age the decrypted copy — never the tty
 * .note = accepts ascii-armored or binary ciphertext
 */
export const decryptWithIdentity = async (input: {
  ciphertext: string | Uint8Array;
  identity: string;
  owner?: string | null;
  /**
   * .what = the CLI-computed prompt attribution (org/tree/env/reach/code), or null
   * .why = the ssh-key-marker branch strips a passphrase via the gnome dialog, so it
   *        renders the attributed prompt + visual-match code, never a bare
   *        `Enter old passphrase` (rule.forbid.contextless-unlock-prompt)
   */
  attribution?: KeyrackUnlockAttribution | null;
}): Promise<string> => {
  // check if identity is an ssh key path marker
  if (input.identity.startsWith(SSH_KEY_PATH_MARKER)) {
    const sshKeyPath = input.identity.slice(SSH_KEY_PATH_MARKER.length);
    return decryptWithAgeCLI({
      ciphertext: input.ciphertext,
      sshKeyPath,
      owner: input.owner ?? null,
      attribution: input.attribution ?? null,
    });
  }

  // decode armor if needed
  const ciphertextBytes =
    typeof input.ciphertext === 'string'
      ? age.armor.decode(input.ciphertext)
      : input.ciphertext;

  // create decrypter and add identity
  const decrypter = new age.Decrypter();
  decrypter.addIdentity(input.identity);

  // decrypt; re-map the ONE expected miss to the shared class so the trial-decrypt
  // loop allowlists it by `instanceof`. the age library throws a bare Error whose
  // message is "no identity matched any of the file's recipients" when this identity
  // is not a recipient — the normal "try the next identity" case. every OTHER fault
  // (corrupt ciphertext, an upstream bug) is left untouched to surface loud
  try {
    return await decrypter.decrypt(ciphertextBytes, 'text');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (isAgeIdentityMissMessage(message))
      throw new AgeIdentityMissError({ cause: message });
    throw error;
  }
};

/**
 * .what = encrypt plaintext via age CLI with multiple recipients
 * .why = produces ssh-ed25519 stanzas for ssh key recipients
 *
 * .note = age CLI with ssh pubkey recipients produces ssh-ed25519 stanzas
 * .note = these stanzas match age CLI decrypt with ssh key identity
 * .note = required for passphrase-protected ssh keys (cipher-aware path)
 */
const encryptWithAgeCLI = (input: {
  plaintext: string;
  recipients: KeyrackKeyRecipient[];
}): string => {
  // the plaintext here is the DECRYPTED manifest (every vault + credential slug),
  // so the temp file must never be world-readable. the shared helper owns the
  // mkdtemp(0700) + guarded rmSync lifecycle — a random, unguessable dir name that
  // closes both the local-read window and the symlink-attack shape a predictable
  // /tmp name would open
  return withPrivateTempDir({ prefix: 'keyrack-age-enc-' }, (dir) => {
    const inputPath = join(dir, 'plaintext.txt');
    const outputPath = join(dir, 'ciphertext.age');
    // 0600 the plaintext for defense-in-depth even inside the 0700 dir
    writeFileSync(inputPath, input.plaintext, {
      encoding: 'utf8',
      mode: 0o600,
    });

    // build age argv with all recipients, e.g. age -e -a -r <pubkey> -o out in
    // - one `-r <pubkey>` pair per recipient; the raw ssh pubkey yields an
    //   ssh-ed25519 stanza, an age1... pubkey yields an X25519 stanza
    // - execFileSync + argv array (never a shell string) so a pubkey can never
    //   be interpreted as shell syntax
    const recipientArgs = input.recipients.flatMap((r) => ['-r', r.pubkey]);

    execFileSync(
      'age',
      ['-e', '-a', ...recipientArgs, '-o', outputPath, inputPath],
      {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
        // bound the call so a hung age process can never wedge the flow forever;
        // the exec tier (non-interactive cpu work), shared with getOneAgentSignature
        timeout: SSH_EXEC_TIMEOUT_MS,
      },
    );

    // read armored output
    return readFileSync(outputPath, 'utf8');
  });
};

/**
 * .what = decrypt ciphertext via age CLI with ssh key
 * .why = decrypts a LEGACY manifest encrypted directly to an ssh recipient (an
 *        `--stanza ssh` blob), which the in-process ed25519->age convert cannot
 *        read without the passphrase
 *
 * .note = age does NOT use ssh-agent, and reads a key passphrase from the tty (no
 *         SSH_ASKPASS) — so a passphrased key is first stripped to a decrypted copy
 *         via the gnome dialog (asDecryptedSshKeyCopy), and age is handed that copy;
 *         a passphrase-less key is handed directly (no strip, no dialog)
 * .note = writes ciphertext to temp file, invokes age -d, cleans up
 *
 * .why-retained = the `age` binary is a LIVE fallback, not merely deferred-removal.
 *   the npm `age-encryption` library speaks only X25519 (age1...) stanzas; it can
 *   NOT read/write the ssh-ed25519 recipient stanzas that two paths still produce,
 *   both of which vision q4 scoped OUT of v1 (ed25519-only):
 *     1. passphrased NON-ed25519 keys (rsa/ecdsa) — init keeps them as raw ssh
 *        recipients (mech 'ssh'), encrypt + decrypt via this binary
 *     2. the opt-in `--stanza ssh` recipient flow (ssh-keygen -p prevention) +
 *        any legacy manifest already minted that way
 *   Variant A (passphrased-ed25519 — the wish) and passwordless keys are both
 *   mech 'age' / X25519 / npm-library only, so they NEVER touch this binary. so
 *   vision q3's "drop the `age` binary" is realized FOR Variant A; a total removal
 *   would also drop the rsa/ecdsa + `--stanza ssh` paths (a scope reduction) and
 *   re-encrypt any legacy ssh-stanza manifests to K (a migration) — a follow-on
 *   decision for the wisher, out of this additive wish's bound (d6)
 */
const decryptWithAgeCLI = (input: {
  ciphertext: string | Uint8Array;
  sshKeyPath: string;
  owner: string | null;
  attribution?: KeyrackUnlockAttribution | null;
}): string => {
  // a private 0700 dir with a random name — the ciphertext is lower-stakes than
  // the plaintext, but a predictable /tmp name is still symlink-attack-shaped
  // (a pre-planted symlink + writeFileSync's follow-symlink write). the shared
  // helper owns the mkdtemp(0700) + guarded rmSync lifecycle
  return withPrivateTempDir({ prefix: 'keyrack-age-dec-' }, (dir) => {
    const tempPath = join(dir, 'ciphertext.age');
    const ciphertextStr =
      typeof input.ciphertext === 'string'
        ? input.ciphertext
        : Buffer.from(input.ciphertext).toString('utf8');
    writeFileSync(tempPath, ciphertextStr, { encoding: 'utf8', mode: 0o600 });

    try {
      // a passphrased key must NOT reach age's tty prompt (vision q2 keylogger hazard):
      // strip its passphrase via the gnome dialog into a decrypted copy in this same
      // 0700 dir, and hand age THAT. a passphrase-less key is handed directly — no
      // dialog resolved, no strip (asSshKeyCipher === 'none'). getOneAskpassDialog is
      // the SAME dialog resolver Variant A uses (KEYRACK_ASKPASS override honored), so
      // an absent dialog fails fast with the install fix, never a tty fall-through
      const keyContent = readFileSync(input.sshKeyPath, 'utf8');
      const keyPassphrased = asSshKeyCipher({ keyContent }) !== 'none';

      // posture signal (vision "awkward" split; r10 gap-1): the age-cli strip path is
      // NOT the ed25519 sign-as-KDF path, so it does NOT carry the ephemeral zero-reuse
      // guarantee. TWO populations ride it: a passphrased rsa/ecdsa key (its permanent
      // path), AND a v0 legacy ed25519 manifest on its FIRST unlock (the one-time decrypt
      // of the old raw-ssh seal, just before the fix-forward re-seals it to K — every
      // later unlock is the native sign-as-KDF path). so the banner is key-type-NEUTRAL:
      // it names the PATH, never the key type, which an ed25519 legacy user would find
      // wrong. emitted BEFORE the headless guard so a headless unlock still opens with
      // this posture banner — the same banner-first cadence as case9 (dialog-present rsa)
      // and case4 (headless init), never a bare up-front blank
      // (rule.forbid.snapshot-visual-blemishes). stderr — a status notice, keeps stdout
      // clean for --json
      if (keyPassphrased)
        console.error(
          `🔓 unlock via age-cli · passphrase stripped via the dialog — this path does NOT carry the ed25519 zero-reuse guarantee`,
        );

      // print the visual-match code so the human can confirm the strip dialog belongs
      // to THIS command before they type (rule.forbid.contextless-unlock-prompt). only
      // when a passphrase is actually stripped (a dialog fires) AND the cli computed an
      // attribution — a passphrase-less key pops no dialog, and a non-cli caller has no
      // code. stderr, so stdout stays clean for --json
      if (keyPassphrased && input.attribution)
        console.error(
          `🔐 unlock code: ${input.attribution.code}   (confirm this matches the dialog before you type)`,
        );

      // fail fast on a headless box via the ONE shared guard the ed25519 path also
      // calls (withKeyrackWrapKeyViaAgent) — the vision calls for the headless
      // fail-fast on BOTH paths, and a shared guard makes the two unable to drift.
      // `owner` now threads through, so the rsa/ecdsa headless message names the
      // correct `--owner` retry flag (it hardcoded null before this unification)
      const dialogSupplied = !!process.env.KEYRACK_ASKPASS;
      assertGraphicalDialogAvailable({
        owner: input.owner,
        keyPath: input.sshKeyPath,
        dialogSupplied,
      });

      // the dialog for the passphrase strip: the raw gnome dialog when no attribution
      // was computed, else a keyrack-owned shim that rewrites the stock
      // `Enter old passphrase` into the attributed message (owner/org/tree/env/code).
      // the shim + its prompt file live in THIS same private 0700 dir, so the dir's own
      // cleanup reaps them — no separate temp dir needed (unlike the async
      // withAttributedAskpassDialog seam the sign path uses, this stays sync)
      const realDialog = getOneAskpassDialog();
      const dialogForStrip = input.attribution
        ? genAskpassShim({
            dialog: realDialog,
            message: asUnlockPromptMessage({
              scope: {
                owner: input.owner ?? '(default)',
                key: input.sshKeyPath,
                ...input.attribution,
              },
            }),
            intoDir: dir,
          })
        : realDialog;

      const keyPathForAge = !keyPassphrased
        ? input.sshKeyPath
        : asDecryptedSshKeyCopy({
            keyPath: input.sshKeyPath,
            dialog: dialogForStrip,
            intoDir: dir,
          });

      // invoke age CLI for decryption via argv (never a shell string), so the key
      // path can never be interpreted as shell syntax: age -d -i <keyPath> <temp>
      const plaintext = execFileSync(
        'age',
        ['-d', '-i', keyPathForAge, tempPath],
        {
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe'],
          // bound the call so a hung age process can never wedge unlock forever;
          // the exec tier (non-interactive cpu work), shared with getOneAgentSignature
          timeout: SSH_EXEC_TIMEOUT_MS,
        },
      );
      return plaintext;
    } catch (error) {
      // re-map the ONE expected miss to the shared class: the age CLI reports a
      // wrong-identity (this key is not a recipient of this ciphertext) as `age:
      // error: no identity matched any of the recipients`, wrapped by execFileSync in
      // a "Command failed" Error. that is the SAME "try the next identity" case the
      // age LIBRARY raises. throwing AgeIdentityMissError from BOTH paths lets the
      // shared trial-decrypt loop (getOneIdentityThatDecrypts) allowlist by `instanceof`
      // — one allowlist covers both decrypt paths (a Variant A K-sealed manifest that a
      // pooled ssh key cannot decrypt must FALL THROUGH to Variant A, never crash). every
      // OTHER age-CLI fault (wrong passphrase, corrupt ciphertext, age absent) is left
      // untouched to surface loud (rule.forbid.failhide)
      // read `.stderr` / `.message` by property, NOT gated on `instanceof Error`:
      // the execFileSync rejection is minted in node's child_process realm, so an
      // `instanceof Error` check fails across a jest module realm (and would silently
      // skip the re-map). a duck-typed read works in every realm
      const faulted = error as { stderr?: unknown; message?: unknown };
      const stderr =
        typeof faulted?.stderr === 'string'
          ? faulted.stderr
          : String(faulted?.stderr ?? '');
      const message =
        typeof faulted?.message === 'string' ? faulted.message : '';
      const isWrongIdentityMiss =
        isAgeIdentityMissMessage(stderr) || isAgeIdentityMissMessage(message);
      if (isWrongIdentityMiss)
        throw new AgeIdentityMissError({ sshKeyPath: input.sshKeyPath });
      throw error;
    }
  });
};

/**
 * .what = generate a new age identity and recipient pair
 * .why = enables keyrack init to create a new recipient key
 *
 * .note = identity is private (AGE-SECRET-KEY-...)
 * .note = recipient is public (age1...)
 */
export const generateAgeKeyPair = async (): Promise<{
  identity: string;
  recipient: string;
}> => {
  const identity = await age.generateIdentity();
  const recipient = await age.identityToRecipient(identity);
  return { identity, recipient };
};

/**
 * .what = derive the manifest age keypair K DETERMINISTICALLY from a 32-byte seed
 * .why = derive-not-store (vision q1): the seed is HKDF(agent.sign(challenge)),
 *        deterministic for an ed25519 key, so K can be RE-DERIVED on every unlock
 *        instead of minted-random + stored-wrapped. this is what deletes the
 *        `keyrack.host.wrapped-identity.age` sidecar — there is no secret to store
 *
 * .note = pure over the seed: the same seed always yields the same {identity,
 *         recipient}. init encrypts the manifest to `recipient`; unlock re-derives
 *         the same `identity` from the same signature and decrypts
 * .note = the age-library boundary (identityToRecipient) stays in this adapter; the
 *         seed→identity curve step is the shared access/ssh transformer
 */
export const asAgeKeyPairFromSeed = async (input: {
  seed: Uint8Array;
}): Promise<{ identity: string; recipient: string }> => {
  const identity = asAgeIdentityFromEd25519Seed({ seed: input.seed });
  const recipient = await age.identityToRecipient(identity);
  return { identity, recipient };
};
