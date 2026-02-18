import { daoKeyrackHostManifest } from '../../access/daos/daoKeyrackHostManifest';
import { daoKeyrackRepoManifest } from '../../access/daos/daoKeyrackRepoManifest';
import {
  type KeyrackGrantMechanism,
  type KeyrackGrantMechanismAdapter,
  KeyrackHostManifest,
  type KeyrackHostVault,
  type KeyrackHostVaultAdapter,
  type KeyrackRepoManifest,
} from '../../domain.objects/keyrack';
import { mechAdapterAwsSso } from './adapters/mechanisms/mechAdapterAwsSso';
import { mechAdapterGithubApp } from './adapters/mechanisms/mechAdapterGithubApp';
import { mechAdapterReplica } from './adapters/mechanisms/mechAdapterReplica';
import { vaultAdapter1Password } from './adapters/vaults/vaultAdapter1Password';
import { vaultAdapterAwsIamSso } from './adapters/vaults/vaultAdapterAwsIamSso';
import { vaultAdapterOsDaemon } from './adapters/vaults/vaultAdapterOsDaemon';
import { vaultAdapterOsDirect } from './adapters/vaults/vaultAdapterOsDirect';
import { vaultAdapterOsEnvvar } from './adapters/vaults/vaultAdapterOsEnvvar';
import { vaultAdapterOsSecure } from './adapters/vaults/vaultAdapterOsSecure';

/**
 * .what = context for grant-scoped keyrack operations
 * .why = provides access to manifests and all adapters
 */
export interface KeyrackGrantContext {
  hostManifest: KeyrackHostManifest;
  repoManifest: KeyrackRepoManifest | null;
  vaultAdapters: Record<KeyrackHostVault, KeyrackHostVaultAdapter>;
  mechAdapters: Record<KeyrackGrantMechanism, KeyrackGrantMechanismAdapter>;
}

/**
 * .what = generate context for grant-scoped keyrack operations
 * .why = constructs runtime context with manifests and adapters
 */
export const genKeyrackGrantContext = async (input: {
  gitroot: string;
}): Promise<KeyrackGrantContext> => {
  // load host manifest (create empty one if none exists)
  const hostManifest =
    (await daoKeyrackHostManifest.get({})) ??
    new KeyrackHostManifest({
      uri: '~/.rhachet/keyrack.manifest.json',
      hosts: {},
    });

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
