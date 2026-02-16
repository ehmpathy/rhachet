import { daoKeyrackHostManifest } from '../../access/daos/daoKeyrackHostManifest';
import {
  KeyrackHostManifest,
  type KeyrackHostVault,
  type KeyrackHostVaultAdapter,
} from '../../domain.objects/keyrack';
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
 * .what = context for host-scoped keyrack operations
 * .why = provides access to host manifest and vault adapters
 *
 * .note = repoManifest is optional; when present, enables @this org resolution
 * .note = gitroot is optional; when present, enables keyrack.yml writes for non-sudo keys
 */
export interface KeyrackHostContext {
  hostManifest: KeyrackHostManifest;
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
}): Promise<KeyrackHostContext> => {
  const { owner } = input;

  // load host manifest (create empty one if none exists)
  const hostManifest =
    (await daoKeyrackHostManifest.get({ owner })) ??
    new KeyrackHostManifest({
      uri: `~/.rhachet/keyrack/keyrack.host${owner ? `.${owner}` : ''}.age`,
      owner,
      recipients: [],
      hosts: {},
    });

  // sync identity from manifest DAO to os.secure vault adapter
  // this enables vault decryption with the same identity used for manifest decryption
  const manifestIdentity = daoKeyrackHostManifest.getSessionIdentity();
  if (manifestIdentity) {
    setOsSecureSessionIdentity(manifestIdentity);
  }

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
    hostManifest,
    vaultAdapters,
  };
};
