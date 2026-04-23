import { ConstraintError, UnexpectedCodePathError } from 'helpful-errors';
import { asIsoTimeStamp, type IsoTimeStamp } from 'iso-time';

import type {
  KeyrackGrantMechanism,
  KeyrackGrantMechanismAdapter,
  KeyrackHostVaultAdapter,
} from '@src/domain.objects/keyrack';
import { KeyrackKeyGrant } from '@src/domain.objects/keyrack';
import { mechAdapterReplica } from '@src/domain.operations/keyrack/adapters/mechanisms/mechAdapterReplica';
import { asKeyrackSlugParts } from '@src/domain.operations/keyrack/asKeyrackSlugParts';
import type { ContextKeyrack } from '@src/domain.operations/keyrack/genContextKeyrack';
import { inferKeyGrade } from '@src/domain.operations/keyrack/grades/inferKeyGrade';
import { inferKeyrackMechForGet } from '@src/domain.operations/keyrack/inferKeyrackMechForGet';
import { inferKeyrackMechForSet } from '@src/domain.operations/keyrack/inferKeyrackMechForSet';

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * .what = entry stored in os.direct vault
 * .why = supports both simple values and ephemeral grants with expiry
 */
interface DirectStoreEntry {
  value: string;
  expiresAt?: string; // ISO8601 — if set, entry is ephemeral
}

/**
 * .what = store format
 * .why = maps slug to entry
 */
type DirectStore = Record<string, DirectStoreEntry>;

/**
 * .what = resolves the home directory
 * .why = uses HOME env var to support test isolation
 *
 * .note = os.homedir() caches at module load; we read process.env.HOME directly
 */
const getHomeDir = (): string => {
  const home = process.env.HOME;
  if (!home) throw new UnexpectedCodePathError('HOME not set', {});
  return home;
};

/**
 * .what = path to the plaintext credential store
 * .why = stores credentials in ~/.rhachet/keyrack/vault/os.direct/owner={owner}/keyrack.direct.json
 *
 * .note = owner enables per-owner vault isolation
 */
const getDirectStorePath = (input: { owner: string | null }): string => {
  const home = getHomeDir();
  const ownerDir = `owner=${input.owner ?? 'default'}`;
  return join(
    home,
    '.rhachet',
    'keyrack',
    'vault',
    'os.direct',
    ownerDir,
    'keyrack.direct.json',
  );
};

/**
 * .what = reads the direct store from disk
 * .why = loads the plaintext key-value store
 */
const readDirectStore = (input: { owner: string | null }): DirectStore => {
  const path = getDirectStorePath({ owner: input.owner });
  if (!existsSync(path)) return {};
  const content = readFileSync(path, 'utf8');
  return JSON.parse(content) as DirectStore;
};

/**
 * .what = writes the direct store to disk
 * .why = persists the plaintext key-value store
 */
const writeDirectStore = (input: {
  store: DirectStore;
  owner: string | null;
}): void => {
  const path = getDirectStorePath({ owner: input.owner });
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(path, JSON.stringify(input.store, null, 2), 'utf8');
};

/**
 * .what = checks if an entry is expired
 * .why = enables ephemeral grant cache invalidation
 */
const isExpired = (entry: DirectStoreEntry): boolean => {
  if (!entry.expiresAt) return false;
  return new Date(entry.expiresAt) < new Date();
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
  };

  const adapter = adapters[mech];
  if (!adapter) {
    throw new UnexpectedCodePathError(`no adapter for mech: ${mech}`, { mech });
  }
  return adapter;
};

/**
 * .what = vault adapter for os-direct storage
 * .why = stores credentials in plaintext json file
 *
 * .note = os.direct requires no unlock — file is always accessible
 */
export const vaultAdapterOsDirect: KeyrackHostVaultAdapter<'readwrite'> = {
  mechs: {
    supported: ['PERMANENT_VIA_REPLICA'],
  },

  /**
   * .what = unlock the vault for the current session
   * .why = os.direct requires no unlock — file is always accessible
   */
  unlock: async () => {
    // noop — plaintext file requires no unlock
  },

  /**
   * .what = check if the vault is unlocked
   * .why = os.direct is always unlocked
   */
  isUnlocked: async () => {
    return true;
  },

  /**
   * .what = retrieve a credential from the plaintext store
   * .why = core operation for grant flow
   *
   * .note = if entry is expired, deletes it and returns null
   * .note = returns full KeyrackKeyGrant with grade, env, org
   */
  get: async (input) => {
    const owner = input.owner ?? null;
    const store = readDirectStore({ owner });
    const entry = store[input.slug];

    // not found
    if (!entry) return null;

    // check expiry
    if (isExpired(entry)) {
      delete store[input.slug];
      writeDirectStore({ store, owner });
      return null;
    }

    const source = entry.value;

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
    const grade = inferKeyGrade({ vault: 'os.direct', mech });

    // extract env/org from slug
    const { env, org } = asKeyrackSlugParts({ slug: input.slug });

    // combine expiresAt from mech (if any) with entry.expiresAt (ephemeral cache)
    const finalExpiresAt: IsoTimeStamp | undefined =
      expiresAt ??
      (entry.expiresAt ? asIsoTimeStamp(new Date(entry.expiresAt)) : undefined);

    return new KeyrackKeyGrant({
      slug: input.slug,
      key: { secret, grade },
      source: { vault: 'os.direct', mech },
      env,
      org,
      expiresAt: finalExpiresAt,
    });
  },

  /**
   * .what = store a credential in the plaintext store
   * .why = enables set flow for credential storage
   *
   * .note = vault encapsulates mech calls:
   *         1. infers mech if not supplied
   *         2. checks mech compat (os.direct only supports PERMANENT_VIA_REPLICA)
   *         3. calls mech.acquireForSet for guided setup
   *         4. stores source credential
   * .note = expiresAt enables ephemeral grant cache
   */
  set: async (input, context?: ContextKeyrack) => {
    // infer mech if not supplied
    const mech =
      input.mech ??
      (await inferKeyrackMechForSet({ vault: vaultAdapterOsDirect }));

    // check mech compat (os.direct only supports permanent mechs — cannot secure ephemeral sources)
    if (!vaultAdapterOsDirect.mechs.supported.includes(mech)) {
      throw new UnexpectedCodePathError(
        `os.direct does not support mech: ${mech}`,
        {
          mech,
          supported: vaultAdapterOsDirect.mechs.supported,
          hint: 'os.direct cannot secure ephemeral source credentials; try --vault os.secure',
        },
      );
    }

    // acquire source credential via mech guided setup
    const mechAdapter = getMechAdapter(mech);
    const { source: secret } = await mechAdapter.acquireForSet({
      keySlug: input.slug,
    });

    const owner = context?.owner ?? null;
    const store = readDirectStore({ owner });
    const entry: DirectStoreEntry = { value: secret };
    if (input.expiresAt) {
      entry.expiresAt = input.expiresAt;
    }
    store[input.slug] = entry;
    writeDirectStore({ store, owner });

    return { mech };
  },

  /**
   * .what = remove a credential from the plaintext store
   * .why = enables del flow for credential removal
   */
  del: async (input) => {
    const owner = input.owner ?? null;
    const store = readDirectStore({ owner });
    delete store[input.slug];
    writeDirectStore({ store, owner });
  },
};
