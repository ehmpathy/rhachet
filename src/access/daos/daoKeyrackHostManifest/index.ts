import {
  BadRequestError,
  ConstraintError,
  UnexpectedCodePathError,
} from 'helpful-errors';
import type { PickOne } from 'type-fns';

import {
  KeyrackHostManifest,
  KeyrackKeyHost,
  KeyrackKeyRecipient,
} from '@src/domain.objects/keyrack';
import { asRedactedAgeIdentity } from '@src/infra/asRedactedAgeIdentity';
import type { ContextKeyrackManifestCodec } from '@src/infra/ContextKeyrackManifestCodec';
import { setFileAtomic } from '@src/infra/filesystem/setFileAtomic';
import { getKeyrackHostManifestPath } from '@src/infra/getKeyrackHostManifestPath';
import {
  decryptWithIdentity,
  encryptToRecipients,
} from '@src/infra/ssh/ageRecipientCrypto';
import { isAgeCiphertextSshSealed } from '@src/infra/ssh/isAgeCiphertextSshSealed';

import { existsSync, mkdirSync, readFileSync } from 'node:fs';
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
    context: ContextKeyrackManifestCodec,
  ): Promise<{ manifest: KeyrackHostManifest } | null> => {
    const { owner } = input;
    const path = getKeyrackHostManifestPath({ owner });

    // return null if file does not exist
    if (!existsSync(path)) return null;

    // read encrypted content (also used to sniff a legacy seal on the no-identity path)
    const ciphertext = readFileSync(path, 'utf8');

    // get identity via lazy cached discovery
    const identity = await context.identity.getOne({ for: 'manifest' });
    if (!identity) {
      // a legacy (v0) manifest sealed to a raw ssh recipient cannot be opened in-process
      // once the Variant A gate routes its passphrased ed25519 key off the age-cli path.
      // name the ACTUAL fix — re-init to upgrade to the native-dialog unlock — instead of
      // the generic "--prikey" hint, which here points at a key that cannot help. this is
      // a caller-fixable state, so a ConstraintError (exit 2), not UnexpectedCodePathError
      if (isAgeCiphertextSshSealed({ ciphertext }))
        throw new ConstraintError(
          `🔐 this keyrack was sealed with an older format the native-dialog unlock cannot open in-process.
to upgrade it to the ssh-agent unlock, re-initialize the manifest (you will re-add its credentials):
   ├─ remove the old manifest: rm ${path}
   └─ re-initialize:           rhx keyrack init`,
          { path, owner },
        );

      // gather identity info for error message — REDACTED: a derived identity is an
      // `AGE-SECRET-KEY-...` secret (K), and this error prints to stderr + is captured in
      // acceptance snapshots, so the raw secret must never enter the metadata. redact the
      // secret material, keep the non-secret shape for diagnostics (derive-not-store: K is
      // never persisted OR exposed)
      const discovered = await context.identity.getAll.discovered();
      const prescribed = context.identity.getAll.prescribed;
      const available = [...prescribed, ...discovered].map(
        asRedactedAgeIdentity,
      );
      // caller-fixable (exit 2, not exit 1): the fix is in the human's hands — make the
      // ssh key that sealed it available, or name it with --prikey. the message names
      // that fix, so the class must match it (ConstraintError), like the legacy-ssh branch
      // above. an UnexpectedCodePathError (exit 1) here would misreport a normal
      // wrong-key/absent-key state as a server malfunction (rule.require.exit-code-semantics)
      throw new ConstraintError(
        `cannot unlock this keyrack manifest — no identity could decrypt it.
   ├─ fix: make its ssh key available, or name it with --prikey <path>
   └─ or:  if sealed to a passphrased key's pubkey recipient, --prikey cannot help —
           re-init instead (re-adds its credentials): rm ${path} && rhx keyrack init`,
        {
          path,
          owner,
          identities: {
            available,
            attempted: available, // all available identities were attempted
          },
          // a rare cross-version risk, kept off the front-line message: if this key
          // unlocked before, an openssh upgrade may have changed how it serializes a
          // signature — the derived identity depends on that, so a changed one derives
          // a different key
          note: 'if this key unlocked before, an openssh upgrade may have changed its signature serialization (a known cross-version risk)',
        },
      );
    }

    // decrypt with discovered identity
    let plaintext: string;
    try {
      plaintext = await decryptWithIdentity({
        ciphertext,
        identity,
        owner,
        attribution: context.promptAttribution ?? null,
      });
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
        meta: host.meta,
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
    context?: ContextKeyrackManifestCodec,
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

    // findsert MUST have context to honor its "never overwrite" contract: the
    // extant-check reads (decrypts) the extant manifest, which needs context. absent
    // context, we cannot prove absence — so fail loud rather than silently degrade to
    // upsert semantics and clobber an extant manifest
    if (input.findsert && existsSync(path) && !context)
      throw new BadRequestError(
        'findsert requires context to check for an extant manifest before write',
        { owner, path },
      );

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

    // write encrypted content atomically with restricted permissions — a crash
    // mid-write must never leave a torn ciphertext that no identity can open
    setFileAtomic({ path, content: ciphertext, mode: 0o600 });

    return manifestDesired;
  },
};
