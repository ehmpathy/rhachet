import { UnexpectedCodePathError } from 'helpful-errors';

import { daoKeyrackHostManifest } from '../../access/daos/daoKeyrackHostManifest';
import { daoKeyrackRepoManifest } from '../../access/daos/daoKeyrackRepoManifest';
import type {
  KeyrackGrantMechanism,
  KeyrackGrantMechanismAdapter,
  KeyrackHostManifest,
  KeyrackHostVault,
  KeyrackHostVaultAdapter,
  KeyrackRepoManifest,
} from '../../domain.objects/keyrack';
import { mechAdapterAwsSso } from './adapters/mechanisms/mechAdapterAwsSso';
import { mechAdapterGithubApp } from './adapters/mechanisms/mechAdapterGithubApp';
import { mechAdapterReplica } from './adapters/mechanisms/mechAdapterReplica';
import { vaultAdapter1Password } from './adapters/vaults/vaultAdapter1Password';
import { vaultAdapterAwsIamSso } from './adapters/vaults/vaultAdapterAwsIamSso';
import { vaultAdapterOsDaemon } from './adapters/vaults/vaultAdapterOsDaemon';
import { vaultAdapterOsDirect } from './adapters/vaults/vaultAdapterOsDirect';
import { vaultAdapterOsEnvvar } from './adapters/vaults/vaultAdapterOsEnvvar';
import {
  setOsSecureSessionIdentity,
  vaultAdapterOsSecure,
} from './adapters/vaults/vaultAdapterOsSecure';

/**
 * .what = full context for keyrack unlock operations
 * .why = unlock reads from vaults and needs manifest decryption + vault adapters
 *
 * .note = this is the heavy context that may prompt for passphrase
 */
export interface ContextKeyrackGrantUnlock {
  hostManifest: KeyrackHostManifest;
  repoManifest: KeyrackRepoManifest | null;
  vaultAdapters: Record<KeyrackHostVault, KeyrackHostVaultAdapter>;
  mechAdapters: Record<KeyrackGrantMechanism, KeyrackGrantMechanismAdapter>;
}

/**
 * .what = generate full context for keyrack unlock operations
 * .why = constructs runtime context with manifests and all adapters
 *
 * .note = prikey is optional; when provided, uses it directly for manifest decryption
 * .note = may prompt for passphrase on manifest decryption
 */
export const genContextKeyrackGrantUnlock = async (input: {
  owner: string | null;
  gitroot: string;
  prikey?: string;
}): Promise<ContextKeyrackGrantUnlock> => {
  const { owner, prikey } = input;

  // load host manifest (fail fast if not found)
  const hostManifest = await daoKeyrackHostManifest.get({ owner, prikey });
  if (!hostManifest)
    throw new UnexpectedCodePathError(
      'host manifest not found. run: rhx keyrack init',
      { owner },
    );

  // sync identity from manifest DAO to os.secure vault adapter
  // this enables vault decryption with the same identity used for manifest decryption
  const manifestIdentity = daoKeyrackHostManifest.getSessionIdentity();
  if (manifestIdentity) {
    setOsSecureSessionIdentity(manifestIdentity);
  }

  // load repo manifest (may not exist)
  const repoManifest = await daoKeyrackRepoManifest.get({
    gitroot: input.gitroot,
  });

  // assemble vault adapters
  const vaultAdapters: Record<KeyrackHostVault, KeyrackHostVaultAdapter> = {
    'os.envvar': vaultAdapterOsEnvvar,
    'os.direct': vaultAdapterOsDirect,
    'os.secure': vaultAdapterOsSecure,
    'os.daemon': vaultAdapterOsDaemon,
    '1password': vaultAdapter1Password,
    'aws.iam.sso': vaultAdapterAwsIamSso,
  };

  // assemble mechanism adapters
  // note: new names (PERMANENT_VIA_*, EPHEMERAL_VIA_*) map to same adapters
  // deprecated aliases (REPLICA, GITHUB_APP, AWS_SSO) kept for backwards compat
  const mechAdapters: Record<
    KeyrackGrantMechanism,
    KeyrackGrantMechanismAdapter
  > = {
    // new mechanism names
    PERMANENT_VIA_REPLICA: mechAdapterReplica,
    EPHEMERAL_VIA_GITHUB_APP: mechAdapterGithubApp,
    EPHEMERAL_VIA_AWS_SSO: mechAdapterAwsSso,
    EPHEMERAL_VIA_GITHUB_OIDC: mechAdapterAwsSso, // TODO: implement dedicated oidc adapter
    // deprecated aliases (backwards compat)
    REPLICA: mechAdapterReplica,
    GITHUB_APP: mechAdapterGithubApp,
    AWS_SSO: mechAdapterAwsSso,
  };

  return {
    hostManifest,
    repoManifest,
    vaultAdapters,
    mechAdapters,
  };
};
