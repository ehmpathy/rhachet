import { daoKeyrackRepoManifest } from '@src/access/daos/daoKeyrackRepoManifest';
import type {
  KeyrackGrantMechanism,
  KeyrackGrantMechanismAdapter,
  KeyrackHostVaultAdapter,
  KeyrackRepoManifest,
} from '@src/domain.objects/keyrack';

import { KEYRACK_MECH_ADAPTERS } from './adapters/mechanisms/getOneKeyrackMechAdapter';
import { vaultAdapterOsEnvvar } from './adapters/vaults/os.envvar/vaultAdapterOsEnvvar';

/**
 * .what = lightweight context for keyrack get operations
 * .why = get only reads from unlocked sources (os.envvar, os.daemon) — no host manifest decryption needed
 *
 * .note = no host manifest, no encrypted vault adapters
 * .note = repo manifest is plaintext yaml — safe to load without passphrase
 * .note = daemon access is handled directly via daemonAccessGet, not via adapter
 * .note = os.direct intentionally excluded — vault keys require explicit unlock first
 * .note = owner enables per-owner daemon isolation
 */
export interface ContextKeyrackGrantGet {
  owner: string | null;
  repoManifest: KeyrackRepoManifest | null;
  envvarAdapter: KeyrackHostVaultAdapter;
  mechAdapters: Record<KeyrackGrantMechanism, KeyrackGrantMechanismAdapter>;
}

/**
 * .what = generate lightweight context for keyrack get
 * .why = avoids host manifest decryption and passphrase prompts for get operations
 *
 * .note = loads repo manifest (plaintext yaml) for slug/org resolution
 * .note = owner enables per-owner daemon isolation
 */
export const genContextKeyrackGrantGet = async (input: {
  gitroot: string | null;
  owner: string | null;
}): Promise<ContextKeyrackGrantGet> => {
  // load repo manifest (plaintext yaml, no passphrase) — BUT only when there IS a repo. a null
  // gitroot means the cwd is not a git repo at all (e.g. a bare clone a git credential helper is
  // invoked from). that path serves only machine-wide @all keys, which need no repo manifest, so
  // skip the load and leave repoManifest null (the no-manifest read path handles @all + full slugs)
  const repoManifest = input.gitroot
    ? await daoKeyrackRepoManifest.get({ gitroot: input.gitroot })
    : null;

  // the mechanism → adapter map: route through the ONE canonical source
  // (KEYRACK_MECH_ADAPTERS) rather than hand-copy it, so this site cannot drift from it
  return {
    owner: input.owner,
    repoManifest,
    envvarAdapter: vaultAdapterOsEnvvar,
    mechAdapters: KEYRACK_MECH_ADAPTERS,
  };
};
