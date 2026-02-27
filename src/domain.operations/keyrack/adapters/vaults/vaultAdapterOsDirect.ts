import { UnexpectedCodePathError } from 'helpful-errors';

import type { KeyrackHostVaultAdapter } from '@src/domain.objects/keyrack';

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
 * .what = vault adapter for os-direct storage
 * .why = stores credentials in plaintext json file
 *
 * .note = os.direct requires no unlock — file is always accessible
 */
export const vaultAdapterOsDirect: KeyrackHostVaultAdapter = {
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

    return entry.value;
  },

  /**
   * .what = store a credential in the plaintext store
   * .why = enables set flow for credential storage
   *
   * .note = expiresAt enables ephemeral grant cache
   */
  set: async (input) => {
    // secret is required for os.direct vault
    if (!input.secret)
      throw new UnexpectedCodePathError('secret required for os.direct vault', {
        slug: input.slug,
      });

    const owner = input.owner ?? null;
    const store = readDirectStore({ owner });
    const entry: DirectStoreEntry = { value: input.secret };
    if (input.expiresAt) {
      entry.expiresAt = input.expiresAt;
    }
    store[input.slug] = entry;
    writeDirectStore({ store, owner });
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
