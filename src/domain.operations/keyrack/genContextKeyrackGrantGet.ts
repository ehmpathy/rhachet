import { daoKeyrackRepoManifest } from '../../access/daos/daoKeyrackRepoManifest';
import type {
  KeyrackGrantMechanism,
  KeyrackGrantMechanismAdapter,
  KeyrackHostVaultAdapter,
  KeyrackRepoManifest,
} from '../../domain.objects/keyrack';
import { mechAdapterAwsSso } from './adapters/mechanisms/mechAdapterAwsSso';
import { mechAdapterGithubApp } from './adapters/mechanisms/mechAdapterGithubApp';
import { mechAdapterReplica } from './adapters/mechanisms/mechAdapterReplica';
import { vaultAdapterOsEnvvar } from './adapters/vaults/vaultAdapterOsEnvvar';

/**
 * .what = lightweight context for keyrack get operations
 * .why = get only reads from unlocked sources (os.envvar, os.daemon) — no host manifest decryption needed
 *
 * .note = no host manifest, no encrypted vault adapters
 * .note = repo manifest is plaintext yaml — safe to load without passphrase
 * .note = daemon access is handled directly via daemonAccessGet, not via adapter
 * .note = os.direct intentionally excluded — vault keys require explicit unlock first
 */
export interface ContextKeyrackGrantGet {
  repoManifest: KeyrackRepoManifest | null;
  envvarAdapter: KeyrackHostVaultAdapter;
  mechAdapters: Record<KeyrackGrantMechanism, KeyrackGrantMechanismAdapter>;
}

/**
 * .what = generate lightweight context for keyrack get
 * .why = avoids host manifest decryption and passphrase prompts for get operations
 *
 * .note = loads repo manifest (plaintext yaml) for slug/org resolution
 */
export const genContextKeyrackGrantGet = async (input: {
  gitroot: string;
}): Promise<ContextKeyrackGrantGet> => {
  // load repo manifest (plaintext yaml, no passphrase)
  const repoManifest = await daoKeyrackRepoManifest.get({
    gitroot: input.gitroot,
  });

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
    repoManifest,
    envvarAdapter: vaultAdapterOsEnvvar,
    mechAdapters,
  };
};
