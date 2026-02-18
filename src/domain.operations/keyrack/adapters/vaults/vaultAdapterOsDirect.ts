import { UnexpectedCodePathError } from 'helpful-errors';

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { KeyrackHostVaultAdapter } from '../../../../domain.objects/keyrack';

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
 * .why = stores credentials in ~/.rhachet/keyrack/vault/os.direct/keyrack.direct.json
 */
const getDirectStorePath = (): string => {
  const home = getHomeDir();
  return join(
    home,
    '.rhachet',
    'keyrack',
    'vault',
    'os.direct',
    'keyrack.direct.json',
  );
};

/**
 * .what = reads the direct store from disk
 * .why = loads the plaintext key-value store
 */
const readDirectStore = (): DirectStore => {
  const path = getDirectStorePath();
  if (!existsSync(path)) return {};
  const content = readFileSync(path, 'utf8');
  return JSON.parse(content) as DirectStore;
};

/**
 * .what = writes the direct store to disk
 * .why = persists the plaintext key-value store
 */
const writeDirectStore = (store: DirectStore): void => {
  const path = getDirectStorePath();
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(path, JSON.stringify(store, null, 2), 'utf8');
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
    const store = readDirectStore();
    const entry = store[input.slug];

    // not found
    if (!entry) return null;

    // check expiry
    if (isExpired(entry)) {
      delete store[input.slug];
      writeDirectStore(store);
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
    const store = readDirectStore();
    const entry: DirectStoreEntry = { value: input.value };
    if (input.expiresAt) {
      entry.expiresAt = input.expiresAt;
    }
    store[input.slug] = entry;
    writeDirectStore(store);
  },

  /**
   * .what = remove a credential from the plaintext store
   * .why = enables del flow for credential removal
   */
  del: async (input) => {
    const store = readDirectStore();
    delete store[input.slug];
    writeDirectStore(store);
  },
};
