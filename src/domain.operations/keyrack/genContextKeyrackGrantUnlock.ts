import { UnexpectedCodePathError } from 'helpful-errors';

import { daoKeyrackHostManifest } from '@src/access/daos/daoKeyrackHostManifest';
import { daoKeyrackRepoManifest } from '@src/access/daos/daoKeyrackRepoManifest';
import type {
  KeyrackGrantMechanism,
  KeyrackGrantMechanismAdapter,
  KeyrackHostManifest,
  KeyrackHostVault,
  KeyrackHostVaultAdapter,
  KeyrackRepoManifest,
} from '@src/domain.objects/keyrack';

import { mechAdapterAwsSso } from './adapters/mechanisms/mechAdapterAwsSso';
import { mechAdapterGithubApp } from './adapters/mechanisms/mechAdapterGithubApp';
import { mechAdapterReplica } from './adapters/mechanisms/mechAdapterReplica';
import { vaultAdapter1Password } from './adapters/vaults/1password/vaultAdapter1Password';
import { vaultAdapterAwsIamSso } from './adapters/vaults/aws.iam.sso/vaultAdapterAwsIamSso';
import { vaultAdapterOsDaemon } from './adapters/vaults/os.daemon/vaultAdapterOsDaemon';
import { vaultAdapterOsDirect } from './adapters/vaults/os.direct/vaultAdapterOsDirect';
import { vaultAdapterOsEnvvar } from './adapters/vaults/os.envvar/vaultAdapterOsEnvvar';
import {
  setOsSecureSessionIdentity,
  vaultAdapterOsSecure,
} from './adapters/vaults/os.secure/vaultAdapterOsSecure';

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
 * .note = prikeys extends discovery for manifest decryption
 * .note = may prompt for passphrase on manifest decryption
 */
export const genContextKeyrackGrantUnlock = async (input: {
  owner: string | null;
  gitroot: string;
  /**
   * .what = supplemental prikeys to consider for manifest decryption
   * .why = extends default discovery (ssh-agent, ~/.ssh/id_ed25519, etc)
   */
  prikeys?: string[];
}): Promise<ContextKeyrackGrantUnlock> => {
  const { owner, prikeys } = input;

  // load host manifest (fail fast if not found)
  const hostManifestResult = await daoKeyrackHostManifest.get({
    owner,
    prikeys,
  });
  if (!hostManifestResult)
    throw new UnexpectedCodePathError(
      'host manifest not found. run: rhx keyrack init',
      { owner },
    );
  const { manifest: hostManifest, identity } = hostManifestResult;

  // sync identity to os.secure vault adapter
  // this enables vault decryption with the same identity used for manifest decryption
  setOsSecureSessionIdentity(identity);

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
  const mechAdapters: Record<
    KeyrackGrantMechanism,
    KeyrackGrantMechanismAdapter
  > = {
    PERMANENT_VIA_REPLICA: mechAdapterReplica,
    PERMANENT_VIA_REFERENCE: mechAdapterReplica, // 1password: passthrough, exid is fetched on unlock
    EPHEMERAL_VIA_SESSION: mechAdapterReplica, // os.daemon: passthrough, already in daemon
    EPHEMERAL_VIA_GITHUB_APP: mechAdapterGithubApp,
    EPHEMERAL_VIA_AWS_SSO: mechAdapterAwsSso,
    EPHEMERAL_VIA_GITHUB_OIDC: mechAdapterAwsSso, // TODO: implement dedicated oidc adapter
  };

  return {
    hostManifest,
    repoManifest,
    vaultAdapters,
    mechAdapters,
  };
};
