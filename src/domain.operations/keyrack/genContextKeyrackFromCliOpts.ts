import { getGitRepoRoot } from 'rhachet-artifact-git';

import { daoKeyrackHostManifest } from '@src/access/daos/daoKeyrackHostManifest';
import { daoKeyrackRepoManifest } from '@src/access/daos/daoKeyrackRepoManifest';

import { type ContextKeyrack, genContextKeyrack } from './genContextKeyrack';
import { genKeyrackUnlockAttribution } from './genKeyrackUnlockAttribution';

/**
 * .what = build the keyrack context from cli opts: get gitroot + repo manifest,
 *         generate the context, and load the host manifest (triggers decryption)
 * .why = set/del/unlock each repeated this identical 4-step prelude verbatim (past
 *        rule-of-three); one named composition keeps each cli action a narrative
 *        and gives the shared prelude a single home (rule.prefer.wet-over-dry)
 *
 * .note = the host-manifest load is what triggers lazy identity discovery (the
 *         passphrase prompt) and populates context.hostManifest; hostResult is
 *         handed back so a caller that must fail-fast on an absent manifest (set)
 *         can, while del/unlock read context.hostManifest and proceed on absence
 * .note = legacy → derive-not-store migration is DELIBERATELY not run in this shared
 *         prelude — it fires from the `unlock` action alone (see the unlock-only call
 *         to migrateKeyrackManifestToVariantA in invokeKeyrack.ts). migration is a full
 *         re-key (re-seal + re-encrypt every os.secure blob) plus a passphrase dialog;
 *         `unlock` is the one command whose contract already means "prove identity now",
 *         so it belongs there, not as a hidden side-effect of a read-shaped set/del/list
 *         (rule.forbid.surprises). a new manifest-read command must make that SAME
 *         choice consciously, never copy the unlock action's migrate block wholesale
 */
export const genContextKeyrackFromCliOpts = async (input: {
  owner: string | null;
  prikey?: string;
  /**
   * .what = the target env for the attributed unlock prompt (e.g. `test`), when the
   *         command has one; defaults to `all` for a whole-manifest read like `list`
   * .why  = env is an always-shown scope word — it narrows the set of keys the
   *         passphrase covers (rule.forbid.contextless-unlock-prompt)
   */
  env?: string | null;
  /**
   * .what = the reach scope for the prompt (e.g. `@this`), when one applies
   * .why  = a conditional scope word — shown only when the command sets it
   */
  reach?: string | null;
}): Promise<{
  context: ContextKeyrack;
  gitroot: Awaited<ReturnType<typeof getGitRepoRoot>>;
  repoManifest: Awaited<ReturnType<typeof daoKeyrackRepoManifest.get>>;
  hostResult: Awaited<ReturnType<typeof daoKeyrackHostManifest.get>>;
}> => {
  // get gitroot + repo manifest to derive org / extends
  const gitroot = await getGitRepoRoot({ from: process.cwd() });
  const repoManifest = await daoKeyrackRepoManifest.get({ gitroot });

  // build the attributed-prompt scope (org/tree/env/reach + a fresh visual-match
  // code), so a passphrase dialog names WHO/WHAT it unlocks and the human can confirm
  // it belongs to THIS command (rule.forbid.contextless-unlock-prompt). env is always
  // shown (default `all` for a whole-manifest read); org falls back when no manifest
  const promptAttribution = genKeyrackUnlockAttribution({
    org: repoManifest?.org ?? '(unknown)',
    env: input.env ?? 'all',
    reach: input.reach ?? null,
    gitroot,
  });

  // create context with lazy identity discovery
  const context = genContextKeyrack({
    owner: input.owner,
    prikeys: input.prikey ? [input.prikey] : undefined,
    repoManifest: repoManifest ?? null,
    gitroot,
    promptAttribution,
  });

  // load host manifest (triggers identity discovery + populates context.hostManifest)
  const hostResult = await daoKeyrackHostManifest.get(
    { owner: input.owner },
    context,
  );

  return { context, gitroot, repoManifest, hostResult };
};
