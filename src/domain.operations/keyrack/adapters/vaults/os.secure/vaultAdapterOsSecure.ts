import { ConstraintError, MalfunctionError } from 'helpful-errors';

import type {
  KeyrackGrantMechanism,
  KeyrackGrantMechanismAdapter,
  KeyrackHostVaultAdapter,
  KeyrackKeyReach,
} from '@src/domain.objects/keyrack';
import { KeyrackKeyGrant } from '@src/domain.objects/keyrack';
import {
  decryptWithIdentity,
  encryptToRecipients,
} from '@src/domain.operations/keyrack/adapters/ageRecipientCrypto';
import { asKeyrackGithubAppSetCommand } from '@src/domain.operations/keyrack/adapters/mechanisms/asKeyrackGithubAppSetCommand';
import { getOneKeyrackMechSecretDelivered } from '@src/domain.operations/keyrack/adapters/mechanisms/getOneKeyrackMechSecretDelivered';
import { mechAdapterGithubApp } from '@src/domain.operations/keyrack/adapters/mechanisms/mechAdapterGithubApp';
import { mechAdapterReplica } from '@src/domain.operations/keyrack/adapters/mechanisms/mechAdapterReplica';
import { asKeyrackOwnerDir } from '@src/domain.operations/keyrack/asKeyrackOwnerDir';
import { asKeyrackSlugHash } from '@src/domain.operations/keyrack/asKeyrackSlugHash';
import { asKeyrackSlugParts } from '@src/domain.operations/keyrack/asKeyrackSlugParts';
import type { ContextKeyrack } from '@src/domain.operations/keyrack/genContextKeyrack';
import { inferKeyGrade } from '@src/domain.operations/keyrack/grades/inferKeyGrade';
import { inferKeyrackMechForSet } from '@src/domain.operations/keyrack/inferKeyrackMechForSet';
import { asKeyrackKeyReachExid } from '@src/domain.operations/keyrack/reach/asKeyrackKeyReachExid';
import { asKeyrackKeyReachField } from '@src/domain.operations/keyrack/reach/asKeyrackKeyReachField';
import { asKeyrackKeySlugAtReach } from '@src/domain.operations/keyrack/reach/asKeyrackKeySlugAtReach';
import { verifyRoundtripDecryption } from '@src/domain.operations/keyrack/verifyRoundtripDecryption';
import { getHomeDir } from '@src/infra/getHomeDir';
import { setFileAtomic } from '@src/infra/setFileAtomic';

import { existsSync, mkdirSync, readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { asKeyrackMechOfSource } from './asKeyrackMechOfSource';
import { asOsSecureSetTreeHead } from './asOsSecureSetTreeHead';
import { asOsSecureSourcePipedValid } from './asOsSecureSourcePipedValid';
import { assertOsSecureMechAgreesWithSource } from './assertOsSecureMechAgreesWithSource';
import { getOneOsSecureMechOfSourcePiped } from './getOneOsSecureMechOfSourcePiped';
import { getOneOsSecureSourceForSet } from './getOneOsSecureSourceForSet';

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
 * .note = the hash is taken over the key ADDRESS, not the bare slug — so a key cut for one
 *         reach lands in its own file rather than overwrite the key beside it. a
 *         reachless address IS the bare slug, so every file written before reach existed
 *         keeps its extant path and stays readable (e1)
 */
const getCredentialPath = (input: {
  slug: string;
  owner: string | null;
  reach?: KeyrackKeyReach;
}): string => {
  const hash = asKeyrackSlugHash({
    slug: asKeyrackKeySlugAtReach({ slug: input.slug, reach: input.reach }),
  });
  return join(getSecureVaultDir({ owner: input.owner }), `${hash}.age`);
};

/**
 * .what = the mech os.secure infers for a set with no --mech
 * .why = a piped source must name its mech by its shape, or be refused; with no pipe, the
 *        human picks via the guided prompt
 */
const getOneOsSecureMechInferred = async (input: {
  sourcePiped: string | null;
  slug: string;
}): Promise<KeyrackGrantMechanism> => {
  if (input.sourcePiped !== null)
    return getOneOsSecureMechOfSourcePiped({
      source: input.sourcePiped,
      slug: input.slug,
    });
  return inferKeyrackMechForSet({ vault: vaultAdapterOsSecure });
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
    throw new MalfunctionError(`no adapter for mech: ${mech}`, { mech });
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
  isSourcePipedAccepted: true,

  /**
   * .what = unlock the vault for the current session
   * .why = validates identity is available for subsequent operations
   *
   * .note = identity flows through context, not session state
   */
  unlock: async (input: { identity: string | null }) => {
    // identity required for os.secure
    if (input.identity === null) {
      throw new MalfunctionError('os.secure unlock requires identity', {
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
    // .note = a reach-ask reads the file cut for THAT reach. when none was cut, this is
    //         a null — an absent key, which the caller reports as such. it never falls
    //         through to the reachless file (e6)
    const owner = input.owner ?? null;
    const path = getCredentialPath({
      slug: input.slug,
      owner,
      reach: input.reach,
    });
    if (!existsSync(path)) return null;

    // identity required for decryption
    const identity = input.identity ?? null;
    if (!identity) {
      throw new MalfunctionError('os.secure vault is locked', {
        input,
        hint: 'identity must be passed via context',
      });
    }

    // decrypt with identity (recipient-encrypted credentials)
    const ciphertextArmored = readFileSync(path, 'utf8');
    const source = await decryptWithIdentity({
      ciphertext: ciphertextArmored,
      identity,
    });

    // detect mech from value: the mech the blob declares, else github-app by shape, else replica
    const inferredMech = asKeyrackMechOfSource({ source });

    // validate mech consistency when both sources specify
    assertOsSecureMechAgreesWithSource({
      mech: input.mech ?? null,
      source,
      slug: input.slug,
    });

    // determine mech: input.mech takes precedence, else use inferred
    const mech = input.mech ?? inferredMech;

    // transform source → usable secret via mech
    // .note = a github-app mint refusal gains os.secure's own cure, at this key's reach: a
    //         pipe of the current blob, or the guided set where gh and a tty exist
    const mechAdapter = getMechAdapter(mech);
    const setVia = (form: 'pipe' | 'guided'): string =>
      asKeyrackGithubAppSetCommand({
        vault: 'os.secure',
        owner,
        slug: input.slug,
        reach: input.reach
          ? asKeyrackKeyReachExid({ reach: input.reach })
          : null,
        form:
          form === 'pipe'
            ? { kind: 'pipe', readSide: null, host: null }
            : { kind: 'guided' },
      });
    const { secret, expiresAt } = await getOneKeyrackMechSecretDelivered({
      mechAdapter,
      source,
      cure: () =>
        `${setVia('pipe')} (or, at a terminal with gh login, the guided set: ${setVia('guided')})`,
    });

    // compute grade from vault + mech
    const grade = inferKeyGrade({ vault: 'os.secure', mech });

    // extract env/org from slug
    const { env, org } = asKeyrackSlugParts({ slug: input.slug });

    return new KeyrackKeyGrant({
      slug: input.slug,
      key: { secret, grade },
      ...asKeyrackKeyReachField({ reach: input.reach }),
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
   * .note = a piped source (input.source) skips the guided setup: the mech validates it and
   *         the vault stores it as-is. the mech is inferred from the blob when not supplied
   */
  set: async (input, context?: ContextKeyrack) => {
    // infer mech if not supplied — from the piped blob, else via the guided prompt
    const sourcePiped = input.source ?? null;
    const mech =
      input.mech ??
      (await getOneOsSecureMechInferred({ sourcePiped, slug: input.slug }));

    // check mech compat
    // .note = caller-fixable (the caller chose an incompatible --vault/--mech pair; the hint
    //         names the fix) → ConstraintError, caught by the set action and rendered as the
    //         clean blocked treestruct (no class-name leak, no stack dump, exit 2)
    if (!vaultAdapterOsSecure.mechs.supported.includes(mech)) {
      throw new ConstraintError(`os.secure does not support mech: ${mech}`, {
        mech,
        supported: vaultAdapterOsSecure.mechs.supported,
        hint: 'try --vault aws.config for aws sso',
      });
    }

    // validate a piped source before any tree opens, so a refusal prints alone
    const mechAdapter = getMechAdapter(mech);
    const sourcePipedValid = asOsSecureSourcePipedValid({
      source: sourcePiped,
      mech,
      slug: input.slug,
      mechAdapter,
    });

    // refuse a piped source whose own mech contradicts --mech, as `get` would
    if (sourcePipedValid !== null)
      assertOsSecureMechAgreesWithSource({
        mech,
        source: sourcePipedValid,
        slug: input.slug,
      });

    // refuse a host with no recipients before any tree opens, so the refusal prints alone
    const recipients = context?.hostManifest?.recipients;
    if (!recipients || recipients.length === 0) {
      throw new MalfunctionError(
        'os.secure set requires recipients from host manifest',
        {
          slug: input.slug,
          hint: 'run keyrack init to add recipients',
        },
      );
    }

    // open the tree the roundtrip result closes
    const treeHead = asOsSecureSetTreeHead({
      slug: input.slug,
      mech,
      isSourcePiped: sourcePipedValid !== null,
    });
    for (const line of treeHead) console.log(line);

    // take the source: the piped one, else the mech's guided setup
    const secret = await getOneOsSecureSourceForSet(
      {
        slug: input.slug,
        mech,
        reach: input.reach,
        sourcePipedValid,
        mechAdapter,
      },
      context,
    );

    // ensure directory exists
    const owner = context?.owner ?? null;
    const dir = getSecureVaultDir({ owner });
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const path = getCredentialPath({
      slug: input.slug,
      owner,
      reach: input.reach,
    });

    // encrypt with recipients from context.hostManifest
    const ciphertext = await encryptToRecipients({
      plaintext: secret,
      recipients,
    });

    // roundtrip verification, in memory, before any write
    // .why = a re-file is the advertised rotation path; a failed verify must leave the prior
    //        good credential in place, never a bad ciphertext over it
    const { verified } = await verifyRoundtripDecryption(
      {
        expected: { ciphertext, plaintext: secret },
        owner,
      },
      context,
    );
    if (!verified) {
      throw new MalfunctionError('os.secure roundtrip verification failed', {
        slug: input.slug,
        hint: 'no identity could decrypt the credential; the prior file, if any, is unchanged',
      });
    }

    // write the verified ciphertext whole, so a crash mid-write never truncates the prior file
    setFileAtomic({ path, content: ciphertext });

    // close the tree, if one opened, with the roundtrip result
    // .note = every vault's guided setup shares one rhythm: a `perfect, now let's verify...`
    //         narration parent, then the roundtrip result as its child. the single blank
    //         separator before the summary header is emitted once by the set-command boundary
    //         (invokeKeyrack, for any EPHEMERAL mech or a piped source), NOT here — a second
    //         blank here would double-space the tree from the header
    if (treeHead.length > 0) {
      console.log('   │');
      console.log("   └─ perfect, now let's verify...");
      console.log('      └─ ✓ roundtrip verified');
    }

    return { mech };
  },

  /**
   * .what = remove a credential from the encrypted vault
   * .why = deletes the age file from disk
   */
  del: async (input) => {
    const owner = input.owner ?? null;
    const path = getCredentialPath({
      slug: input.slug,
      owner,
      reach: input.reach,
    });
    if (existsSync(path)) {
      unlinkSync(path);
    }
  },
};
