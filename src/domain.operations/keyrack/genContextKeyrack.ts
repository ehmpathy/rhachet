import { createCache } from 'simple-in-memory-cache';
import { withSimpleCache } from 'with-simple-cache';

import type {
  KeyrackHostManifest,
  KeyrackHostVault,
  KeyrackHostVaultAdapter,
  KeyrackRepoManifest,
} from '@src/domain.objects/keyrack';
import { decryptWithIdentity } from '@src/domain.operations/keyrack/adapters/ageRecipientCrypto';
import { discoverIdentities } from '@src/domain.operations/keyrack/discoverIdentities';
import { getKeyrackHostManifestPath } from '@src/domain.operations/keyrack/getKeyrackHostManifestPath';
import { sshPrikeyToAgeIdentity } from '@src/infra/ssh';

import { existsSync, readFileSync } from 'node:fs';
import { vaultAdapter1Password } from './adapters/vaults/1password/vaultAdapter1Password';
import { vaultAdapterAwsConfig } from './adapters/vaults/aws.config/vaultAdapterAwsConfig';
import { vaultAdapterOsDaemon } from './adapters/vaults/os.daemon/vaultAdapterOsDaemon';
import { vaultAdapterOsDirect } from './adapters/vaults/os.direct/vaultAdapterOsDirect';
import { vaultAdapterOsEnvvar } from './adapters/vaults/os.envvar/vaultAdapterOsEnvvar';
import { vaultAdapterOsSecure } from './adapters/vaults/os.secure/vaultAdapterOsSecure';

/**
 * .what = unified context for keyrack operations
 * .why = merges DAO and domain contexts; provides lazy-cached identity discovery
 *
 * .note = identity.getOne discovers on first call via trial decrypt, then cached
 * .note = identity.getAll.discovered is lazy cached; getAll.prescribed is from cli
 * .note = hostManifest is set by daoKeyrackHostManifest.get() after decryption
 */
export interface ContextKeyrack {
  owner: string | null;
  identity: {
    /**
     * .what = get identity for a purpose (e.g., manifest decryption)
     * .why = lazy discovery + trial decrypt on first call, then cached
     */
    getOne: (input: { for: 'manifest' }) => Promise<string | null>;
    getAll: {
      /**
       * .what = identities discovered from ssh-agent, ~/.ssh/$owner, etc.
       * .why = lazy discovery avoids filesystem/agent access until needed
       */
      discovered: () => Promise<string[]>;
      /**
       * .what = identities from cli --prikey flags
       * .why = explicit identities take precedence over discovered
       */
      prescribed: string[];
    };
  };
  hostManifest?: KeyrackHostManifest;
  repoManifest?: KeyrackRepoManifest | null;
  gitroot?: string | null;
  vaultAdapters: Record<KeyrackHostVault, KeyrackHostVaultAdapter>;
}

/**
 * .what = generate context for keyrack operations
 * .why = creates unified context with lazy identity discovery and vault adapters
 *
 * .note = factory is sync; identity discovery happens lazily on first getOne call
 * .note = hostManifest is populated by daoKeyrackHostManifest.get()
 */
export const genContextKeyrack = (input: {
  owner: string | null;
  /**
   * .what = supplemental prikeys to consider for manifest decryption
   * .why = extends default discovery (ssh-agent, ~/.ssh/id_ed25519, etc)
   */
  prikeys?: string[];
  repoManifest?: KeyrackRepoManifest | null;
  gitroot?: string | null;
}): ContextKeyrack => {
  const { owner, prikeys } = input;

  // getAll.discovered: lazy cached identity discovery
  const discovered = withSimpleCache(
    async () => discoverIdentities({ owner: input.owner }),
    { cache: createCache() },
  );

  // getAll.prescribed: prikey paths from cli --prikey flags
  const prescribed = prikeys ?? [];

  // getOne: lazy cached, calls getAll internally when pool is built
  const getOne = withSimpleCache(
    async (_args: { for: 'manifest' }) => {
      // convert paths to identities
      const prescribedIdentities = prescribed
        .map((path) => {
          try {
            return sshPrikeyToAgeIdentity({ keyPath: path });
          } catch {
            return null;
          }
        })
        .filter((id): id is string => id !== null);

      // build pool: prescribed first (explicit takes precedence), then discovered
      const pool = [...prescribedIdentities, ...(await discovered())];
      return trialDecryptManifest({ owner, pool });
    },
    { cache: createCache() },
  );

  return {
    owner: input.owner,
    identity: {
      getOne,
      getAll: { discovered, prescribed },
    },
    repoManifest: input.repoManifest,
    gitroot: input.gitroot,
    vaultAdapters: {
      'os.envvar': vaultAdapterOsEnvvar,
      'os.direct': vaultAdapterOsDirect,
      'os.secure': vaultAdapterOsSecure,
      'os.daemon': vaultAdapterOsDaemon,
      '1password': vaultAdapter1Password,
      'aws.config': vaultAdapterAwsConfig,
    },
  };
};

/**
 * .what = try each identity to decrypt the host manifest
 * .why = returns the identity that works, or null if none work
 *
 * .note = returns null if manifest file does not exist
 * .note = returns null if no identity can decrypt
 */
const trialDecryptManifest = async (input: {
  owner: string | null;
  pool: string[];
}): Promise<string | null> => {
  const path = getKeyrackHostManifestPath({ owner: input.owner });

  // return null if file does not exist
  if (!existsSync(path)) return null;

  // return null if no identities to try
  if (input.pool.length === 0) return null;

  // read encrypted content
  const ciphertext = readFileSync(path, 'utf8');

  // try each identity until one decrypts
  for (const identity of input.pool) {
    try {
      await decryptWithIdentity({ ciphertext, identity });
      return identity;
    } catch {
      // continue to next identity
    }
  }

  // no identity worked
  return null;
};
