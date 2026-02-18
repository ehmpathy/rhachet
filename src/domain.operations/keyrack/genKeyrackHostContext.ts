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
import { vaultAdapterOsSecure } from './adapters/vaults/vaultAdapterOsSecure';

/**
 * .what = context for host-scoped keyrack operations
 * .why = provides access to host manifest and vault adapters
 */
export interface KeyrackHostContext {
  hostManifest: KeyrackHostManifest;
  vaultAdapters: Record<KeyrackHostVault, KeyrackHostVaultAdapter>;
}

/**
 * .what = generate context for host-scoped keyrack operations
 * .why = constructs runtime context with host manifest and vault adapters
 */
export const genKeyrackHostContext = async (): Promise<KeyrackHostContext> => {
  // load host manifest (create empty one if none exists)
  const hostManifest =
    (await daoKeyrackHostManifest.get({})) ??
    new KeyrackHostManifest({
      uri: '~/.rhachet/keyrack.manifest.json',
      hosts: {},
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

  return {
    hostManifest,
    vaultAdapters,
  };
};
