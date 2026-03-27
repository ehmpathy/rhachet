import { createCache } from 'simple-in-memory-cache';
import { withSimpleCache } from 'with-simple-cache';

import type {
  KeyrackHostManifest,
  KeyrackHostVault,
  KeyrackHostVaultAdapter,
  KeyrackRepoManifest,
} from '@src/domain.objects/keyrack';
import { decryptWithIdentity } from '@src/domain.operations/keyrack/adapters/ageRecipientCrypto';
import { getKeyrackHostManifestPath } from '@src/domain.operations/keyrack/getKeyrackHostManifestPath';
import { listSshAgentKeys, sshPrikeyToAgeIdentity } from '@src/infra/ssh';

import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { vaultAdapter1Password } from './adapters/vaults/1password/vaultAdapter1Password';
import { vaultAdapterAwsIamSso } from './adapters/vaults/aws.iam.sso/vaultAdapterAwsIamSso';
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
    async () => discoverIdentities({ owner }),
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
      'aws.iam.sso': vaultAdapterAwsIamSso,
    },
  };
};

/**
 * .what = discover identities from ssh-agent and filesystem
 * .why = builds pool of identities to try for manifest decryption
 *
 * .note = checks owner-specific path first (e.g., ~/.ssh/ehmpath)
 * .note = then checks ssh-agent keys (if path comment is available)
 * .note = then checks standard paths (~/.ssh/id_ed25519, etc)
 */
const discoverIdentities = (input: { owner: string | null }): string[] => {
  const identities: string[] = [];
  const home = process.env.HOME ?? homedir();

  // check owner-specific path first (e.g., ~/.ssh/ehmpath) — most likely to be correct
  if (input.owner) {
    const ownerPath = join(home, '.ssh', input.owner);
    if (existsSync(ownerPath)) {
      try {
        const identity = sshPrikeyToAgeIdentity({ keyPath: ownerPath });
        if (!identities.includes(identity)) identities.push(identity);
      } catch {
        // skip keys that fail to convert
      }
    }
  }

  // check ssh-agent keys (path from comment)
  const agentKeys = listSshAgentKeys();
  for (const agentKey of agentKeys) {
    const keyPath = agentKey.comment;
    if (keyPath && existsSync(keyPath)) {
      try {
        const identity = sshPrikeyToAgeIdentity({ keyPath });
        if (!identities.includes(identity)) identities.push(identity);
      } catch {
        // skip keys that fail to convert
      }
    }
  }

  // check standard ssh paths
  const standardPaths = [
    join(home, '.ssh', 'id_ed25519'),
    join(home, '.ssh', 'id_rsa'),
    join(home, '.ssh', 'id_ecdsa'),
  ];
  for (const stdPath of standardPaths) {
    if (existsSync(stdPath)) {
      try {
        const identity = sshPrikeyToAgeIdentity({ keyPath: stdPath });
        if (!identities.includes(identity)) identities.push(identity);
      } catch {
        // skip keys that fail to convert
      }
    }
  }

  return identities;
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
