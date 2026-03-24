import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';
import type { PickOne } from 'type-fns';

import {
  KeyrackHostManifest,
  KeyrackKeyHost,
  KeyrackKeyRecipient,
} from '@src/domain.objects/keyrack';
import {
  decryptWithIdentity,
  encryptToRecipients,
} from '@src/domain.operations/keyrack/adapters/ageRecipientCrypto';
import { getKeyrackHostManifestPath } from '@src/domain.operations/keyrack/getKeyrackHostManifestPath';
import { listSshAgentKeys, sshPrikeyToAgeIdentity } from '@src/infra/ssh';

import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { schemaKeyrackHostManifest } from './schema';

/**
 * .what = get all available identities to try for decryption
 * .why = enables trial-decryption via discovery + supplemental prikeys
 *
 * .note = checks ssh-agent first (most likely to have unlocked key)
 * .note = then checks standard ssh paths (~/.ssh/id_ed25519, etc)
 * .note = then merges in any supplemental prikeys provided
 */
const getAllAvailableIdentities = (input: {
  prikeys?: string[];
}): { identities: string[]; conversionFailures: ConversionFailure[] } => {
  const identities: string[] = [];
  const conversionFailures: ConversionFailure[] = [];
  const home = process.env.HOME ?? homedir();
  const standardPaths = [
    join(home, '.ssh', 'id_ed25519'),
    join(home, '.ssh', 'id_rsa'),
    join(home, '.ssh', 'id_ecdsa'),
  ];

  // 1. discover from ssh-agent (most likely unlocked)
  const agentKeys = listSshAgentKeys();
  for (const agentKey of agentKeys) {
    // agent keys have path as comment (e.g., "/home/user/.ssh/id_ed25519")
    const keyPath = agentKey.comment;
    if (!keyPath || !existsSync(keyPath)) continue;
    try {
      const identity = sshPrikeyToAgeIdentity({ keyPath });
      if (!identities.includes(identity)) identities.push(identity);
    } catch (error) {
      // track conversion failures for observability (prikey might be unsupported format)
      conversionFailures.push({
        source: 'ssh-agent',
        keyPath,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // 2. discover from default locations
  for (const stdPath of standardPaths) {
    if (!existsSync(stdPath)) continue;
    try {
      const identity = sshPrikeyToAgeIdentity({ keyPath: stdPath });
      if (!identities.includes(identity)) identities.push(identity);
    } catch (error) {
      // track conversion failures for observability (prikey might be unsupported format)
      conversionFailures.push({
        source: 'default',
        keyPath: stdPath,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // 3. merge supplemental prikeys
  for (const prikeyPath of input.prikeys ?? []) {
    if (!existsSync(prikeyPath)) continue;
    try {
      const identity = sshPrikeyToAgeIdentity({ keyPath: prikeyPath });
      if (!identities.includes(identity)) identities.push(identity);
    } catch (error) {
      // track conversion failures for observability (prikey might be unsupported format)
      conversionFailures.push({
        source: 'supplemental',
        keyPath: prikeyPath,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { identities, conversionFailures };
};

type ConversionFailure = {
  source: 'ssh-agent' | 'default' | 'supplemental';
  keyPath: string;
  error: string;
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
   * .what = read the host manifest from disk
   * .why = loads credential storage config for this machine
   *
   * .note = always discovers identities from default locations
   * .note = merges in any supplemental prikeys provided
   * .note = trials all identities until one decrypts
   * .note = returns both manifest and the identity that decrypted it
   */
  get: async (input: {
    owner: string | null;
    prikeys?: string[];
  }): Promise<{ manifest: KeyrackHostManifest; identity: string } | null> => {
    const { owner, prikeys } = input;
    const path = getKeyrackHostManifestPath({ owner });

    // return null if file does not exist
    if (!existsSync(path)) return null;

    // read encrypted content
    const ciphertext = readFileSync(path, 'utf8');

    // discover identities + merge supplements
    const { identities: availableIdentities, conversionFailures } =
      getAllAvailableIdentities({ prikeys });

    if (availableIdentities.length === 0)
      throw new UnexpectedCodePathError(
        'no identity available for manifest decryption; ensure ssh key is available or use --prikey flag',
        { path, owner, conversionFailures },
      );

    // trial decryption — try each identity until one decrypts
    let plaintext: string | undefined;
    let identityUsed: string | null = null;
    let lastError: Error | null = null;

    for (const identity of availableIdentities) {
      try {
        plaintext = await decryptWithIdentity({ ciphertext, identity });
        identityUsed = identity;
        break;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        // continue to next identity
      }
    }

    // check if decryption succeeded
    if (plaintext === undefined)
      throw new BadRequestError(
        'failed to decrypt host manifest with any available identity; use --prikey to specify the correct key',
        {
          path,
          owner,
          triedIdentities: availableIdentities.length,
          conversionFailures:
            conversionFailures.length > 0 ? conversionFailures : undefined,
          lastDecryptionError: lastError?.message,
        },
      );

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

    return {
      manifest: new KeyrackHostManifest({
        uri: result.data.uri,
        owner: result.data.owner,
        recipients,
        hosts,
      }),
      identity: identityUsed!,
    };
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
    }> & {
      /**
       * .what = supplemental prikeys to consider for findsert manifest decryption
       * .why = extends discovery when checking if manifest already exists
       */
      prikeys?: string[];
    },
  ): Promise<KeyrackHostManifest> => {
    // determine which manifest to persist
    const manifestDesired = input.findsert ?? input.upsert;
    if (!manifestDesired)
      throw new UnexpectedCodePathError(
        'set requires either findsert or upsert',
        { input },
      );

    // extract owner from manifest
    const owner = manifestDesired.owner;
    const path = getKeyrackHostManifestPath({ owner });

    // check if manifest already exists (need identity to decrypt for findsert check)
    let manifestFound: KeyrackHostManifest | null = null;
    if (input.findsert && existsSync(path)) {
      // for findsert, we need to read the extant manifest
      // discovery + supplements will be used in get()
      const getResult = await daoKeyrackHostManifest.get({
        owner,
        prikeys: input.prikeys,
      });
      manifestFound = getResult?.manifest ?? null;
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
