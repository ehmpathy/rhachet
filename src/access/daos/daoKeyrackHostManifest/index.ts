import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';
import type { PickOne } from 'type-fns';

import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  KeyrackHostManifest,
  KeyrackKeyHost,
  KeyrackKeyRecipient,
} from '../../../domain.objects/keyrack';
import {
  decryptWithIdentity,
  encryptToRecipients,
} from '../../../domain.operations/keyrack/adapters/ageRecipientCrypto';
import { getKeyrackHostManifestPath } from '../../../domain.operations/keyrack/getKeyrackHostManifestPath';
import { listSshAgentKeys, sshPrikeyToAgeIdentity } from '../../../infra/ssh';
import { schemaKeyrackHostManifest } from './schema';

/**
 * .what = session state for the age identity
 * .why = tracks the decryption identity for the current session
 *
 * .note = identity is held in memory only for the session lifetime
 * .note = per blueprint amendment 6.4: identity files were removed; discovery is at runtime
 */
let sessionIdentity: string | null = null;

/**
 * .what = get the active identity from session or env
 * .why = provides explicit identity; discovery is the fallback
 *
 * .note = per blueprint amendment 6.4: identity files removed
 * .note = discovery happens at runtime via getAllAvailableIdentities
 */
const getExplicitIdentity = (): string | null => {
  // check session identity (in-memory for this process)
  if (sessionIdentity) return sessionIdentity;

  return null;
};

/**
 * .what = get all available identities to try for decryption
 * .why = enables trial-decryption when no identity is explicitly set
 *
 * .note = checks ssh-agent first (most likely to have unlocked key)
 * .note = then checks standard ssh paths (~/.ssh/id_ed25519, etc)
 */
const getAllAvailableIdentities = (): string[] => {
  const identities: string[] = [];
  const home = process.env.HOME ?? homedir();
  const standardPaths = [
    join(home, '.ssh', 'id_ed25519'),
    join(home, '.ssh', 'id_rsa'),
    join(home, '.ssh', 'id_ecdsa'),
  ];

  // check ssh-agent first
  const agentKeys = listSshAgentKeys();
  for (const agentKey of agentKeys) {
    try {
      // agent keys have path as comment (e.g., "/home/user/.ssh/id_ed25519")
      const keyPath = agentKey.comment;
      if (keyPath && existsSync(keyPath)) {
        const identity = sshPrikeyToAgeIdentity({ keyPath });
        if (!identities.includes(identity)) identities.push(identity);
      }
    } catch {
      // skip keys that fail to convert
    }
  }

  // check standard ssh paths
  for (const stdPath of standardPaths) {
    if (!existsSync(stdPath)) continue;
    try {
      const identity = sshPrikeyToAgeIdentity({ keyPath: stdPath });
      if (!identities.includes(identity)) identities.push(identity);
    } catch {
      // skip keys that fail to convert
    }
  }

  return identities;
};

/**
 * .what = persistence for the per-machine host manifest
 * .why = stores key hosts in encrypted age file at ~/.rhachet/keyrack/keyrack.host.age
 *
 * .note = manifest is encrypted to all recipients listed in manifest.recipients
 * .note = decryption requires an age identity (private key) via session or runtime discovery
 */
export const daoKeyrackHostManifest = {
  /**
   * .what = set the session identity for decryption
   * .why = enables manifest decryption without env var
   */
  setSessionIdentity: (identity: string | null): void => {
    sessionIdentity = identity;
  },

  /**
   * .what = get the current session identity
   * .why = enables vault adapters to use the same identity for decryption
   *
   * .note = returns the identity after successful manifest decryption
   * .note = includes discovered identity from runtime discovery
   */
  getSessionIdentity: (): string | null => {
    return sessionIdentity;
  },

  /**
   * .what = check if an explicit identity is available for decryption
   * .why = callers can check before get; note: discovery may still find keys
   *
   * .note = per blueprint 6.4: only checks session/env, not discovery
   * .note = discovery happens at runtime in get() if no explicit identity
   */
  hasIdentity: (): boolean => {
    return getExplicitIdentity() !== null;
  },

  /**
   * .what = read the host manifest from disk
   * .why = loads credential storage config for this machine
   *
   * .note = decrypts with session identity, runtime discovery, or explicit --prikey
   * .note = if prikey provided, uses it directly instead of discovery
   */
  get: async (input: {
    owner?: string | null;
    prikey?: string;
  }): Promise<KeyrackHostManifest | null> => {
    const owner = input.owner ?? null;
    const path = getKeyrackHostManifestPath({ owner });

    // return null if file does not exist
    if (!existsSync(path)) return null;

    // read encrypted content
    const ciphertext = readFileSync(path, 'utf8');

    // get identity for decryption — try prikey first, then explicit, then discover
    let explicitIdentity: string | null = null;
    if (input.prikey) {
      // user provided explicit prikey path — use it directly
      explicitIdentity = sshPrikeyToAgeIdentity({ keyPath: input.prikey });
    } else {
      explicitIdentity = getExplicitIdentity();
    }

    // decrypt with explicit identity if available
    let plaintext: string | undefined;
    if (explicitIdentity) {
      try {
        plaintext = await decryptWithIdentity({
          ciphertext,
          identity: explicitIdentity,
        });
      } catch (error) {
        throw new BadRequestError('failed to decrypt host manifest', {
          path,
          owner,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } else {
      // no explicit identity — try all available identities (discovery)
      const availableIdentities = getAllAvailableIdentities();
      if (availableIdentities.length === 0)
        throw new UnexpectedCodePathError(
          'no identity available for manifest decryption; call setSessionIdentity, ensure ssh key is available, or use --prikey flag',
          { path, owner },
        );

      // try each identity until one decrypts
      let lastError: Error | null = null;
      let discoveredIdentity: string | null = null;
      for (const identity of availableIdentities) {
        try {
          plaintext = await decryptWithIdentity({ ciphertext, identity });
          discoveredIdentity = identity;
          break;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          // continue to next identity
        }
      }

      // save discovered identity for subsequent operations (e.g., vault decryption)
      if (discoveredIdentity) {
        sessionIdentity = discoveredIdentity;
      }

      // check if decryption succeeded (plaintext will be set if any identity worked)
      if (plaintext === undefined)
        throw new BadRequestError(
          'failed to decrypt host manifest with any available identity; use --prikey to specify the correct key',
          {
            path,
            owner,
            triedIdentities: availableIdentities.length,
            lastError: lastError?.message,
          },
        );
    }

    // parse json
    let parsed: unknown;
    try {
      parsed = JSON.parse(plaintext);
    } catch {
      throw new BadRequestError('keyrack host manifest has invalid json', {
        path,
      });
    }

    // validate schema
    const result = schemaKeyrackHostManifest.safeParse(parsed);
    if (!result.success) {
      throw new BadRequestError('keyrack host manifest has invalid schema', {
        path,
        issues: result.error.issues,
      });
    }

    // hydrate domain objects
    const hosts: Record<string, KeyrackKeyHost> = {};
    for (const [slug, host] of Object.entries(result.data.hosts)) {
      hosts[slug] = new KeyrackKeyHost({
        slug: host.slug,
        exid: host.exid,
        vault: host.vault,
        mech: host.mech,
        env: host.env,
        org: host.org,
        vaultRecipient: host.vaultRecipient,
        maxDuration: host.maxDuration,
        createdAt: host.createdAt,
        updatedAt: host.updatedAt,
      });
    }

    // hydrate recipients
    const recipients: KeyrackKeyRecipient[] = result.data.recipients.map(
      (r) =>
        new KeyrackKeyRecipient({
          mech: r.mech,
          pubkey: r.pubkey,
          label: r.label,
          addedAt: r.addedAt,
        }),
    );

    return new KeyrackHostManifest({
      uri: result.data.uri,
      owner: result.data.owner,
      recipients,
      hosts,
    });
  },

  /**
   * .what = write the host manifest to disk
   * .why = persists credential storage config for this machine
   *
   * .note = encrypts to all recipients in manifest.recipients
   * .note = supports findsert (no update on match) and upsert (update on match)
   */
  set: async (
    input: PickOne<{
      findsert: KeyrackHostManifest;
      upsert: KeyrackHostManifest;
    }>,
  ): Promise<KeyrackHostManifest> => {
    // resolve which manifest to persist
    const manifestDesired = input.findsert ?? input.upsert;
    if (!manifestDesired)
      throw new UnexpectedCodePathError(
        'set requires either findsert or upsert',
        { input },
      );

    // resolve owner from manifest
    const owner = manifestDesired.owner;
    const path = getKeyrackHostManifestPath({ owner });

    // check if manifest already exists (need identity to decrypt for findsert check)
    let manifestFound: KeyrackHostManifest | null = null;
    if (input.findsert && existsSync(path)) {
      // for findsert, we need to read the extant manifest
      // if no explicit identity, discovery will be attempted in get()
      manifestFound = await daoKeyrackHostManifest.get({ owner });
    }

    // handle findsert: return found if exists with same uri
    if (input.findsert && manifestFound) {
      if (manifestFound.uri === input.findsert.uri) return manifestFound;
      throw new BadRequestError(
        'can not findsert; manifest already exists with different uri',
        { uriFound: manifestFound.uri, uriDesired: input.findsert.uri },
      );
    }

    // validate recipients exist for encryption
    if (manifestDesired.recipients.length === 0)
      throw new UnexpectedCodePathError(
        'manifest must have at least one recipient for encryption',
        { owner },
      );

    // ensure directory exists
    const dir = dirname(path);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // serialize to json
    const plaintext = JSON.stringify(manifestDesired, null, 2);

    // encrypt to all recipients
    const ciphertext = await encryptToRecipients({
      plaintext,
      recipients: manifestDesired.recipients,
    });

    // write encrypted content with restricted permissions
    writeFileSync(path, ciphertext, 'utf8');
    chmodSync(path, 0o600);

    return manifestDesired;
  },
};
