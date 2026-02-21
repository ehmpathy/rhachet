import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';

import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { daoKeyrackHostManifest } from '../../access/daos/daoKeyrackHostManifest';
import { daoKeyrackRepoManifest } from '../../access/daos/daoKeyrackRepoManifest';
import {
  KeyrackHostManifest,
  KeyrackKeyRecipient,
} from '../../domain.objects/keyrack';
import {
  extractSshKeyCipher,
  findDefaultSshKey,
  isAgeCLIAvailable,
  readSshPubkey,
  sshPrikeyToAgeIdentity,
  sshPubkeyToAgeRecipient,
} from '../../infra/ssh';
import { getKeyrackHostManifestPath } from './getKeyrackHostManifestPath';

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

  // resolve key paths from pubkey input
  const keyPaths = (() => {
    if (input.pubkey) {
      // pubkey input can be: value, .pub file path, or private key path
      if (input.pubkey.startsWith('ssh-') || input.pubkey.startsWith('age')) {
        // looks like a pubkey value — cannot derive private key
        throw new BadRequestError(
          'pubkey value provided but private key path required for init; pass path instead',
          { pubkey: input.pubkey.slice(0, 30) + '...' },
        );
      }
      // treat as path — normalize to private key path
      const prikeyPath = input.pubkey.endsWith('.pub')
        ? input.pubkey.replace(/\.pub$/, '')
        : input.pubkey;
      return {
        prikeyPath,
        pubkeyPath: `${prikeyPath}.pub`,
        mech: 'ssh' as const,
      };
    }
    // find default key
    const found = findDefaultSshKey();
    if (!found)
      throw new BadRequestError(
        'no ed25519 key found; create one with: ssh-keygen -t ed25519',
        { searched: '~/.ssh/id_ed25519, id_rsa, id_ecdsa' },
      );
    return {
      prikeyPath: found.path,
      pubkeyPath: found.pubkeyPath,
      mech: 'ssh' as const,
    };
  })();

  // validate key files present
  if (!existsSync(keyPaths.prikeyPath))
    throw new BadRequestError('private key not found', {
      path: keyPaths.prikeyPath,
    });
  if (!existsSync(keyPaths.pubkeyPath))
    throw new BadRequestError('public key not found', {
      path: keyPaths.pubkeyPath,
    });

  // convert private key to age identity for decryption (session only)
  const ageIdentity = sshPrikeyToAgeIdentity({ keyPath: keyPaths.prikeyPath });
  daoKeyrackHostManifest.setSessionIdentity(ageIdentity);

  // check if already initialized (idempotent)
  if (existsSync(manifestPath)) {
    // load manifest to get recipient
    const manifestFound = await daoKeyrackHostManifest.get({ owner });
    if (!manifestFound)
      throw new UnexpectedCodePathError(
        'manifest file present but could not be read',
        { manifestPath, owner },
      );

    // return extant recipient
    const recipientFound = manifestFound.recipients[0];
    if (!recipientFound)
      throw new UnexpectedCodePathError(
        'manifest present but has no recipients',
        { manifestPath, owner },
      );

    // handle repo manifest if gitroot provided
    const repoResult = await initRepoManifest({
      gitroot: input.gitroot ?? null,
      org: input.org ?? null,
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
  const pubkeyContent = readSshPubkey({ keyPath: keyPaths.prikeyPath });

  // detect cipher to determine recipient format (cipher-aware init)
  // - passwordless keys (cipher: none) → convert to age1... (npm library path)
  // - passphrase-protected keys → keep ssh-ed25519... (age CLI path)
  const keyContent = readFileSync(keyPaths.prikeyPath, 'utf8');
  const cipher = extractSshKeyCipher({ keyContent });

  // create recipient with cipher-aware format
  const recipient = (() => {
    // passwordless key: convert to native age recipient (npm library path)
    if (cipher === 'none') {
      const ageRecipient = sshPubkeyToAgeRecipient({ pubkey: pubkeyContent });
      return new KeyrackKeyRecipient({
        mech: 'age',
        pubkey: ageRecipient,
        label: input.label ?? 'default',
        addedAt: new Date().toISOString(),
      });
    }

    // passphrase-protected key: keep raw ssh pubkey (age CLI path)
    // requires age CLI for encrypt AND decrypt
    if (!isAgeCLIAvailable())
      throw new BadRequestError(
        `🔐 your ssh key is passphrase-protected (cipher: ${cipher}).
keyrack uses the \`age\` cli to encrypt/decrypt via ssh-agent — no passphrase prompt needed.

install age:
  ├─ brew install age          # macos
  └─ apt install age           # ubuntu/debian

then retry: rhx keyrack init

note: passphrase-less keys (-N "") do not need age installed.`,
        { cipher, keyPath: keyPaths.prikeyPath },
      );

    return new KeyrackKeyRecipient({
      mech: 'ssh',
      pubkey: pubkeyContent,
      label: input.label ?? 'default',
      addedAt: new Date().toISOString(),
    });
  })();

  // ensure directory present
  const dir = dirname(manifestPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // create manifest
  const manifest = new KeyrackHostManifest({
    uri: manifestPath.replace(process.env.HOME ?? '', '~'),
    owner,
    recipients: [recipient],
    hosts: {},
  });

  // save manifest (encrypted to pubkey recipient)
  await daoKeyrackHostManifest.set({ findsert: manifest });

  // handle repo manifest if gitroot provided
  const repoResult = await initRepoManifest({
    gitroot: input.gitroot ?? null,
    org: input.org ?? null,
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
 */
const initRepoManifest = async (input: {
  gitroot: string | null;
  org: string | null;
}): Promise<{
  manifestPath: string;
  org: string;
  effect: 'created' | 'found';
} | null> => {
  // if not in a git repo, skip repo manifest
  if (!input.gitroot) return null;

  // check if repo manifest already exists
  const repoManifestPath = daoKeyrackRepoManifest.getPath({
    gitroot: input.gitroot,
  });
  const repoManifestPresent = existsSync(repoManifestPath);

  // if repo manifest exists, init it (will return 'found')
  if (repoManifestPresent) {
    return daoKeyrackRepoManifest.init({
      gitroot: input.gitroot,
      org: input.org ?? 'unknown', // org is ignored when manifest already exists
    });
  }

  // if repo manifest absent and no org provided, skip (user must use --org)
  if (!input.org) return null;

  // create repo manifest with provided org
  return daoKeyrackRepoManifest.init({
    gitroot: input.gitroot,
    org: input.org,
  });
};
