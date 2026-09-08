import type { PickOne } from 'type-fns';

import type {
  KeyrackGrantMechanism,
  KeyrackGrantMechanismAdapter,
  KeyrackHostVaultAdapter,
  KeyrackRepoManifest,
} from '@src/domain.objects/keyrack';

import { KEYRACK_MECH_ADAPTERS } from './adapters/mechanisms/getOneKeyrackMechAdapter';
import { vaultAdapterOsEnvvar } from './adapters/vaults/os.envvar/vaultAdapterOsEnvvar';
import { getOneKeyrackRepoManifestForAsk } from './getOneKeyrackRepoManifestForAsk';

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

  /**
   * .what = the ask this context serves, so the load can be skipped when it will not be read
   * .why = OPTIONAL, a deliberate exception to `rule.forbid.undefined-inputs`, because
   *        `genContextKeyrackGrantGet` is a published sdk export (sdk.keyrack.ts). an ask
   *        the builder was not told about loads the manifest exactly as before, so every
   *        extant caller is byte-identical
   */
  for?: PickOne<{ keys: string[]; repo: true }>;
  org?: string;
}): Promise<ContextKeyrackGrantGet> => {
  // load repo manifest (plaintext yaml, no passphrase) — BUT only when the ask will actually
  // consult it. two ways it will not:
  //
  //   1. a null gitroot: the cwd is not a git repo at all (e.g. a bare clone a git credential
  //      helper is invoked from), so there is no manifest to load
  //   2. a machine-wide ask: an `@all` key belongs to the BOX's own namespace, so no repo
  //      manifest can declare it (getAllKeyrackSlugsForEnv derives every repo slug from
  //      manifest.org, so a repo manifest can never emit an `@all.*` slug). the load buys no
  //      answer AND inherits every way it can fail — invalid yaml, invalid schema, a circular
  //      extends, an absent extends target
  //
  // the two used to be one branch keyed on (1) alone, which asked "is there a repo?" where the
  // honest question is "will this ask consult one?". those agree until a repo is present and
  // its manifest cannot hydrate — the reported defect (ehmpathy/rhachet#467)
  //
  // .note = delegated to `getOneKeyrackRepoManifestForAsk`, which owns this decision for all
  //         three load sites. spelled inline here once, it read as this builder's own policy;
  //         it is the repo's policy, and one definition is what keeps the three from drift
  const repoManifest = await getOneKeyrackRepoManifestForAsk({
    gitroot: input.gitroot,
    for: input.for ?? null,
    org: input.org ?? null,
  });

  // the mechanism → adapter map: route through the ONE canonical source
  // (KEYRACK_MECH_ADAPTERS) rather than hand-copy it, so this site cannot drift from it
  return {
    owner: input.owner,
    repoManifest,
    envvarAdapter: vaultAdapterOsEnvvar,
    mechAdapters: KEYRACK_MECH_ADAPTERS,
  };
};
