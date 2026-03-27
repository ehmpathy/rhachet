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
import type { ContextKeyrack } from '@src/domain.operations/keyrack/genContextKeyrack';
import { getKeyrackHostManifestPath } from '@src/domain.operations/keyrack/getKeyrackHostManifestPath';

import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname } from 'node:path';
import { schemaKeyrackHostManifest } from './schema';

/**
 * .what = persistence for the per-machine host manifest
 * .why = stores key hosts in encrypted age file at ~/.rhachet/keyrack/keyrack.host.age
 *
 * .note = manifest is encrypted to all recipients listed in manifest.recipients
 * .note = decryption via context.identity.getOne({ for: 'manifest' }) — lazy cached
 */
export const daoKeyrackHostManifest = {
  /**
   * .what = read the host manifest from disk
   * .why = loads credential storage config for this machine
   *
   * .note = uses context.identity.getOne({ for: 'manifest' }) to discover identity
   * .note = sets context.hostManifest after successful decryption
   */
  get: async (
    input: {
      owner: string | null;
    },
    context: ContextKeyrack,
  ): Promise<{ manifest: KeyrackHostManifest } | null> => {
    const { owner } = input;
    const path = getKeyrackHostManifestPath({ owner });

    // return null if file does not exist
    if (!existsSync(path)) return null;

    // get identity via lazy cached discovery
    const identity = await context.identity.getOne({ for: 'manifest' });
    if (!identity)
      throw new UnexpectedCodePathError(
        'no identity could decrypt manifest; ensure ssh key is available or use --prikey flag',
        { path, owner },
      );

    // read encrypted content
    const ciphertext = readFileSync(path, 'utf8');

    // decrypt with discovered identity
    let plaintext: string;
    try {
      plaintext = await decryptWithIdentity({ ciphertext, identity });
    } catch (error) {
      throw new BadRequestError('failed to decrypt host manifest', {
        path,
        owner,
        error: error instanceof Error ? error.message : String(error),
      });
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

    const manifest = new KeyrackHostManifest({
      uri: result.data.uri,
      owner: result.data.owner,
      recipients,
      hosts,
    });

    // set hostManifest on context for caller access
    context.hostManifest = manifest;

    return { manifest };
  },

  /**
   * .what = write the host manifest to disk
   * .why = persists credential storage config for this machine
   *
   * .note = encrypts to all recipients in manifest.recipients
   * .note = supports findsert (no update on match) and upsert (update on match)
   * .note = context required for findsert (to read extant manifest)
   */
  set: async (
    input: PickOne<{
      findsert: KeyrackHostManifest;
      upsert: KeyrackHostManifest;
    }>,
    context?: ContextKeyrack,
  ): Promise<KeyrackHostManifest> => {
    // extract manifest to persist
    const manifestDesired = input.findsert ?? input.upsert;
    if (!manifestDesired)
      throw new UnexpectedCodePathError(
        'set requires either findsert or upsert',
        { input },
      );

    // extract owner from manifest
    const owner = manifestDesired.owner;
    const path = getKeyrackHostManifestPath({ owner });

    // check if manifest already exists (need context to decrypt for findsert check)
    let manifestFound: KeyrackHostManifest | null = null;
    if (input.findsert && existsSync(path) && context) {
      // for findsert, we need to read the extant manifest
      const result = await daoKeyrackHostManifest.get({ owner }, context);
      manifestFound = result?.manifest ?? null;
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
