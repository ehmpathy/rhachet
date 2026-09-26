import { ConstraintError, UnexpectedCodePathError } from 'helpful-errors';

import type {
  KeyrackGrantMechanism,
  KeyrackGrantMechanismAdapter,
  KeyrackHostVaultAdapter,
} from '@src/domain.objects/keyrack';
import { KeyrackKeyGrant } from '@src/domain.objects/keyrack';
import { mechAdapterGithubApp } from '@src/domain.operations/keyrack/adapters/mechanisms/mechAdapterGithubApp';
import { mechAdapterReplica } from '@src/domain.operations/keyrack/adapters/mechanisms/mechAdapterReplica';
import { asKeyrackOwnerDir } from '@src/domain.operations/keyrack/asKeyrackOwnerDir';
import { asKeyrackSlugHash } from '@src/domain.operations/keyrack/asKeyrackSlugHash';
import { asKeyrackSlugParts } from '@src/domain.operations/keyrack/asKeyrackSlugParts';
import type { ContextKeyrack } from '@src/domain.operations/keyrack/genContextKeyrack';
import { inferKeyGrade } from '@src/domain.operations/keyrack/grades/inferKeyGrade';
import { inferKeyrackMechForGet } from '@src/domain.operations/keyrack/inferKeyrackMechForGet';
import { inferKeyrackMechForSet } from '@src/domain.operations/keyrack/inferKeyrackMechForSet';
import { verifyRoundtripDecryption } from '@src/domain.operations/keyrack/verifyRoundtripDecryption';
import { setFileAtomic } from '@src/infra/filesystem/setFileAtomic';
import { getHomeDir } from '@src/infra/getHomeDir';
import {
  decryptWithIdentity,
  encryptToRecipients,
} from '@src/infra/ssh/ageRecipientCrypto';

import { existsSync, mkdirSync, readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

/**
 * .what = directory for encrypted credential files
 * .why = stores age-encrypted files at ~/.rhachet/keyrack/vault/os.secure/owner={owner}/
 *
 * .note = owner enables per-owner vault isolation
 */
const getSecureVaultDir = (input: { owner: string | null }): string => {
  const home = getHomeDir();
  const ownerDir = asKeyrackOwnerDir({ owner: input.owner });
  return join(home, '.rhachet', 'keyrack', 'vault', 'os.secure', ownerDir);
};

/**
 * .what = path for a specific credential file
 * .why = each credential is stored as a separate .age file
 *
 * .note = exported so a re-key (migration) can operate on the raw ciphertext of a
 *         credential without a get/set round-trip — get runs the mech's deliverForGet
 *         which transforms the source into a usable secret, so it cannot round-trip
 *         the stored blob. one path helper keeps the re-key in lockstep with storage
 */
export const getOsSecureCredentialPath = (input: {
  slug: string;
  owner: string | null;
}): string => {
  const hash = asKeyrackSlugHash({ slug: input.slug });
  return join(getSecureVaultDir({ owner: input.owner }), `${hash}.age`);
};

/**
 * .what = lookup mech adapter by mechanism name
 * .why = vault needs to call mech.acquireForSet for guided setup
 */
const getMechAdapter = (
  mech: KeyrackGrantMechanism,
): KeyrackGrantMechanismAdapter => {
  const adapters: Partial<
    Record<KeyrackGrantMechanism, KeyrackGrantMechanismAdapter>
  > = {
    PERMANENT_VIA_REPLICA: mechAdapterReplica,
    EPHEMERAL_VIA_GITHUB_APP: mechAdapterGithubApp,
  };

  const adapter = adapters[mech];
  if (!adapter) {
    throw new UnexpectedCodePathError(`no adapter for mech: ${mech}`, { mech });
  }
  return adapter;
};

/**
 * .what = vault adapter for os-secure storage
 * .why = stores credentials in age-encrypted files with identity-based encryption
 *
 * .note = os.secure requires identity from context for all operations
 */
export const vaultAdapterOsSecure: KeyrackHostVaultAdapter<'readwrite'> = {
  mechs: {
    supported: ['PERMANENT_VIA_REPLICA', 'EPHEMERAL_VIA_GITHUB_APP'],
  },

  /**
   * .what = unlock the vault for the current session
   * .why = validates identity is available for subsequent operations
   *
   * .note = identity flows through context, not session state
   */
  unlock: async (input: { identity: string | null }) => {
    // identity required for os.secure
    if (input.identity === null) {
      throw new UnexpectedCodePathError('os.secure unlock requires identity', {
        hint: 'use --prikey to specify ssh key or run keyrack init',
      });
    }
    // no-op — identity will be passed to get/isUnlocked via context
  },

  /**
   * .what = check if the vault is unlocked
   * .why = returns true if identity is available in input
   */
  isUnlocked: async (input) => {
    return input?.identity !== null && input?.identity !== undefined;
  },

  /**
   * .what = retrieve a credential from the encrypted vault
   * .why = decrypts the age file with identity from input
   *
   * .note = returns full KeyrackKeyGrant with grade, env, org
   */
  get: async (input) => {
    // return null if file does not exist
    const owner = input.owner ?? null;
    const path = getOsSecureCredentialPath({ slug: input.slug, owner });
    if (!existsSync(path)) return null;

    // identity required for decryption
    const identity = input.identity ?? null;
    if (!identity) {
      throw new UnexpectedCodePathError('os.secure vault is locked', {
        input,
        hint: 'identity must be passed via context',
      });
    }

    // decrypt with identity (recipient-encrypted credentials)
    const ciphertextArmored = readFileSync(path, 'utf8');
    const source = await decryptWithIdentity({
      ciphertext: ciphertextArmored,
      identity,
      owner,
    });

    // detect mech from value (JSON blob or plain string)
    const inferredMech = inferKeyrackMechForGet({ value: source });

    // validate mech consistency when both sources specify
    if (
      input.mech &&
      inferredMech !== 'PERMANENT_VIA_REPLICA' &&
      input.mech !== inferredMech
    ) {
      throw new ConstraintError(
        'mech mismatch: host manifest and blob disagree',
        {
          hostManifestMech: input.mech,
          blobMech: inferredMech,
          slug: input.slug,
          hint: 'update host manifest or blob to match',
        },
      );
    }

    // determine mech: input.mech takes precedence, else use inferred
    const mech = input.mech ?? inferredMech;

    // transform source → usable secret via mech
    const mechAdapter = getMechAdapter(mech);
    const { secret, expiresAt } = await mechAdapter.deliverForGet({ source });

    // compute grade from vault + mech
    const grade = inferKeyGrade({ vault: 'os.secure', mech });

    // extract env/org from slug
    const { env, org } = asKeyrackSlugParts({ slug: input.slug });

    return new KeyrackKeyGrant({
      slug: input.slug,
      key: { secret, grade },
      source: { vault: 'os.secure', mech },
      env,
      org,
      expiresAt,
    });
  },

  /**
   * .what = store a credential in the encrypted vault
   * .why = encrypts with age to recipients and writes to disk
   *
   * .note = vault encapsulates mech calls:
   *         1. infers mech if not supplied
   *         2. checks mech compat
   *         3. calls mech.acquireForSet for guided setup
   *         4. stores source credential
   */
  set: async (input, context?: ContextKeyrack) => {
    // infer mech if not supplied
    const mech =
      input.mech ??
      (await inferKeyrackMechForSet({ vault: vaultAdapterOsSecure }));

    // check mech compat
    if (!vaultAdapterOsSecure.mechs.supported.includes(mech)) {
      throw new UnexpectedCodePathError(
        `os.secure does not support mech: ${mech}`,
        {
          mech,
          supported: vaultAdapterOsSecure.mechs.supported,
          hint: 'try --vault aws.config for aws sso',
        },
      );
    }

    // acquire source credential via mech guided setup
    const mechAdapter = getMechAdapter(mech);

    // emit vault header for ephemeral mechs (they have guided setup)
    if (mech === 'EPHEMERAL_VIA_GITHUB_APP') {
      console.log(`🔐 keyrack set ${input.slug} via ${mech}`);
    }

    // mech guided setup continues the tree
    const { source: secret } = await mechAdapter.acquireForSet({
      keySlug: input.slug,
    });

    // ensure directory exists
    const owner = context?.owner ?? null;
    const dir = getSecureVaultDir({ owner });
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const path = getOsSecureCredentialPath({ slug: input.slug, owner });

    // encrypt with recipients from context.hostManifest
    const recipients = context?.hostManifest?.recipients;
    if (!recipients || recipients.length === 0) {
      throw new UnexpectedCodePathError(
        'os.secure set requires recipients from host manifest',
        {
          slug: input.slug,
          hint: 'run keyrack init to add recipients',
        },
      );
    }
    const ciphertext = await encryptToRecipients({
      plaintext: secret,
      recipients,
    });

    // write the encrypted credential ATOMICALLY at 0o600 — the same crash-safe write the
    // migration re-key uses (setFileAtomic). a plain writeFileSync truncates-then-writes,
    // so a crash mid-write leaves a torn ciphertext no identity can open — a bricked
    // credential beside a whole manifest (rule.require.os-secure-seals-to-host-manifest).
    // 0o600 also hardens perms — a secret blob must never be world-readable
    setFileAtomic({ path, content: ciphertext, mode: 0o600 });

    // roundtrip verification
    const { verified } = await verifyRoundtripDecryption(
      {
        expected: {
          ciphertext: readFileSync(path, 'utf8'),
          plaintext: secret,
        },
        owner,
      },
      context,
    );
    if (!verified) {
      throw new UnexpectedCodePathError(
        'os.secure roundtrip verification failed',
        {
          slug: input.slug,
          hint: 'no identity could decrypt the credential',
        },
      );
    }

    // emit verification success for ephemeral mech tree output
    if (mech === 'EPHEMERAL_VIA_GITHUB_APP') {
      console.log('   │');
      console.log('   └─ ✓ roundtrip verified');
      console.log('\u2800'); // braille blank for visual space (survives PTY)
    }

    return { mech };
  },

  /**
   * .what = remove a credential from the encrypted vault
   * .why = deletes the age file from disk
   */
  del: async (input) => {
    const owner = input.owner ?? null;
    const path = getOsSecureCredentialPath({ slug: input.slug, owner });
    if (existsSync(path)) {
      unlinkSync(path);
    }
  },
};
