import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';

import { daoKeyrackHostManifest } from '@src/access/daos/daoKeyrackHostManifest';
import { daoKeyrackRepoManifest } from '@src/access/daos/daoKeyrackRepoManifest';
import {
  KeyrackHostManifest,
  type KeyrackKeyRecipient,
} from '@src/domain.objects/keyrack';
import { getKeyrackHostManifestPath } from '@src/infra/getKeyrackHostManifestPath';
import { asSshKeyCipher } from '@src/infra/ssh/asSshKeyCipher';
import type { KeyrackUnlockAttribution } from '@src/infra/ssh/asUnlockPromptMessage';
import { getOneSshPubkey } from '@src/infra/ssh/getOneSshPubkey';

import { existsSync, readFileSync } from 'node:fs';
import { asInitKeyPaths } from './asInitKeyPaths';
import { genContextKeyrack } from './genContextKeyrack';
import { genKeyrackRecipientSealed } from './genKeyrackRecipientSealed';

/**
 * .what = initialize keyrack with a recipient key
 * .why = creates the encrypted host manifest via user's extant key
 *
 * .note = uses extant ed25519 private key — never generates age keypairs
 * .note = private key converted to age identity on-the-fly for decryption
 * .note = manifest encrypted to pubkey and stored at keyrack.host.age (or .${owner}.age)
 * .note = idempotent: returns extant manifest if already initialized
 * .note = also initializes repo manifest (keyrack.yml) if gitroot provided
 */
export const initKeyrack = async (input: {
  owner?: string | null;
  pubkey?: string;
  recipientMech?: 'yubikey';
  label?: string;
  gitroot?: string | null;
  org?: string | null;
  at?: string | null;
  /**
   * .what = override the gnome askpass dialog candidate paths
   * .why = Variant A prompts for a passphrased key via the dialog; tests inject a
   *        scripted stand-in here, and a custom install location can be pointed at
   */
  askpassCandidates?: string[];
  /**
   * .what = the CLI-computed prompt attribution (org/tree/env/reach/code), or null
   * .why = the passphrased-ed25519 init dialog renders it (owner/org/tree + code) so
   *        the human authorizes with full knowledge, never a bare passphrase prompt
   *        (rule.forbid.contextless-unlock-prompt); also threaded onto the idempotent
   *        re-init read, whose legacy-manifest strip pops the same dialog
   */
  attribution?: KeyrackUnlockAttribution | null;
}): Promise<{
  host: {
    owner: string | null;
    recipient: KeyrackKeyRecipient;
    manifestPath: string;
    effect: 'created' | 'found';
  };
  repo: {
    manifestPath: string;
    org: string;
    effect: 'created' | 'found';
  } | null;
}> => {
  const owner = input.owner ?? null;
  const manifestPath = getKeyrackHostManifestPath({ owner });

  // derive key paths from --pubkey input, or the default ssh key (narrative).
  // owner is passed so the default-key lookup is owner-first — the SAME precedence
  // unlock's Variant A uses, so init seals with the key unlock re-derives K from
  const keyPaths = asInitKeyPaths({ pubkey: input.pubkey, owner });

  // validate key files present
  if (!existsSync(keyPaths.prikeyPath))
    throw new BadRequestError('private key not found', {
      path: keyPaths.prikeyPath,
    });
  if (!existsSync(keyPaths.pubkeyPath))
    throw new BadRequestError('public key not found', {
      path: keyPaths.pubkeyPath,
    });

  // check if already initialized (idempotent)
  if (existsSync(manifestPath)) {
    // load manifest to get recipient (pass prikey for decryption)
    const context = genContextKeyrack({
      owner,
      prikeys: [keyPaths.prikeyPath],
      promptAttribution: input.attribution,
    });
    const result = await daoKeyrackHostManifest.get({ owner }, context);
    if (!result)
      throw new UnexpectedCodePathError(
        'manifest file present but could not be read',
        { manifestPath, owner },
      );

    // return extant recipient
    const recipientFound = result.manifest.recipients[0];
    if (!recipientFound)
      throw new UnexpectedCodePathError(
        'manifest present but has no recipients',
        { manifestPath, owner },
      );

    // handle repo manifest if gitroot provided
    const repoResult = await initRepoManifest({
      gitroot: input.gitroot ?? null,
      org: input.org ?? null,
      at: input.at ?? null,
    });

    return {
      host: {
        owner,
        recipient: recipientFound,
        manifestPath,
        effect: 'found',
      },
      repo: repoResult,
    };
  }

  // read pubkey content for recipient
  const pubkeyContent = getOneSshPubkey({ keyPath: keyPaths.prikeyPath });

  // detect cipher to determine recipient format (cipher- + type-aware init)
  // - passwordless keys (cipher: none) → convert to age1... (npm library path)
  // - passphrased ed25519 keys → Variant A: encrypt to a minted age identity K,
  //   whose secret is sealed under the sign-as-KDF wrap key (npm library path)
  // - passphrased non-ed25519 keys → the extant ssh-recipient age CLI fallback
  const keyContent = readFileSync(keyPaths.prikeyPath, 'utf8');
  const cipher = asSshKeyCipher({ keyContent });

  // create recipient (+ optional sealed K to persist) with cipher-/type-aware
  // format — the three-way dispatch lives behind one named call (narrative)
  const sealed = await genKeyrackRecipientSealed({
    owner,
    cipher,
    pubkeyContent,
    keyPath: keyPaths.prikeyPath,
    pubkeyPath: keyPaths.pubkeyPath,
    label: input.label,
    askpassCandidates: input.askpassCandidates,
    attribution: input.attribution,
  });
  const recipient = sealed.recipient;

  // create manifest — daoKeyrackHostManifest.set creates its own parent dir
  const manifest = new KeyrackHostManifest({
    uri: manifestPath.replace(process.env.HOME ?? '', '~'),
    owner,
    recipients: [recipient],
    hosts: {},
  });

  // derive-not-store: there is NO secret to persist. K is re-derived from the ssh
  // signature at unlock, so init writes ONLY the manifest (encrypted to K's derived
  // recipient). the manifest is the single completion marker the idempotent
  // early-return keys on
  await daoKeyrackHostManifest.set({ findsert: manifest });

  // handle repo manifest if gitroot provided
  const repoResult = await initRepoManifest({
    gitroot: input.gitroot ?? null,
    org: input.org ?? null,
    at: input.at ?? null,
  });

  return {
    host: {
      owner,
      recipient,
      manifestPath,
      effect: 'created',
    },
    repo: repoResult,
  };
};

/**
 * .what = initialize repo manifest (keyrack.yml) if conditions are met
 * .why = repo manifest declares org for the project's keyrack
 *
 * .note = when `at` is provided, creates keyrack at custom path (for role-level keyracks)
 * .note = creates basic manifest with org only (no extends; use `init --keys` for extends)
 */
const initRepoManifest = async (input: {
  gitroot: string | null;
  org: string | null;
  at: string | null;
}): Promise<{
  manifestPath: string;
  org: string;
  effect: 'created' | 'found';
} | null> => {
  // if not in a git repo, skip repo manifest
  if (!input.gitroot) return null;

  // if no org provided, skip (user must use --org)
  if (!input.org) return null;

  // use daoKeyrackRepoManifest.init for basic manifest (no extends)
  const result = await daoKeyrackRepoManifest.init({
    gitroot: input.gitroot,
    org: input.org,
    at: input.at ?? undefined,
  });

  return {
    manifestPath: result.manifestPath,
    org: input.org,
    effect: result.effect,
  };
};
