import { UnexpectedCodePathError } from 'helpful-errors';

import { daoKeyrackHostManifest } from '@src/access/daos/daoKeyrackHostManifest';
import type {
  KeyrackHostManifest,
  KeyrackHostVault,
  KeyrackHostVaultAdapter,
} from '@src/domain.objects/keyrack';

import { vaultAdapter1Password } from './adapters/vaults/vaultAdapter1Password';
import { vaultAdapterAwsIamSso } from './adapters/vaults/vaultAdapterAwsIamSso';
import { vaultAdapterOsDaemon } from './adapters/vaults/vaultAdapterOsDaemon';
import { vaultAdapterOsDirect } from './adapters/vaults/vaultAdapterOsDirect';
import { vaultAdapterOsEnvvar } from './adapters/vaults/vaultAdapterOsEnvvar';
import { vaultAdapterOsSecure } from './adapters/vaults/vaultAdapterOsSecure';

/**
 * .what = context for host-scoped keyrack operations
 * .why = provides access to host manifest, identity, and vault adapters
 *
 * .note = identity is the age identity that decrypted the host manifest
 * .note = repoManifest is optional; when present, enables @this org resolution
 * .note = gitroot is optional; when present, enables keyrack.yml writes for non-sudo keys
 */
export interface KeyrackHostContext {
  owner: string | null;
  hostManifest: KeyrackHostManifest;
  identity: string;
  repoManifest?: { org: string } | null;
  gitroot?: string | null;
  vaultAdapters: Record<KeyrackHostVault, KeyrackHostVaultAdapter>;
}

/**
 * .what = generate context for host-scoped keyrack operations
 * .why = constructs runtime context with host manifest and vault adapters
 */
export const genKeyrackHostContext = async (input: {
  owner: string | null;
  /**
   * .what = supplemental prikeys to consider for manifest decryption
   * .why = extends default discovery (ssh-agent, ~/.ssh/id_ed25519, etc)
   */
  prikeys?: string[];
}): Promise<KeyrackHostContext> => {
  const { owner, prikeys } = input;

  // load host manifest (fail fast if not found)
  const result = await daoKeyrackHostManifest.get({
    owner,
    prikeys,
  });
  if (!result) {
    const initTip = owner
      ? `run: rhx keyrack init --owner ${owner}`
      : 'run: rhx keyrack init';
    throw new UnexpectedCodePathError(`host manifest not found. ${initTip}`, {
      owner,
    });
  }

  const { manifest: hostManifest, identity } = result;

  // assemble vault adapters
  const vaultAdapters: Record<KeyrackHostVault, KeyrackHostVaultAdapter> = {
    'os.envvar': vaultAdapterOsEnvvar,
    'os.direct': vaultAdapterOsDirect,
    'os.secure': vaultAdapterOsSecure,
    'os.daemon': vaultAdapterOsDaemon,
    '1password': vaultAdapter1Password,
    'aws.iam.sso': vaultAdapterAwsIamSso,
  };

  return {
    owner,
    hostManifest,
    identity,
    vaultAdapters,
  };
};
