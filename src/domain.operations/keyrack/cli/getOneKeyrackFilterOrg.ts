import { daoKeyrackRepoManifest } from '@src/access/daos/daoKeyrackRepoManifest';
import { getGitRepoRootOrNull } from '@src/infra/git/getGitRepoRootOrNull';

import { asKeyrackFilterOrg } from '../asKeyrackFilterOrg';

/**
 * .what = expand an `--org` FILTER value for a caller who holds NO repo manifest yet
 * .why = `status` and `list` sweep the HOST manifest, so they never load a repo manifest of
 *        their own. `@this` names the repo though, so that one value needs one — this operation
 *        is the i/o half that fetches it, so the expansion RULE can stay pure and shared
 *
 * .note = the rule itself lives in `asKeyrackFilterOrg`, and is DELEGATED to rather than
 *         re-stated. `unlock` is HANDED a manifest by its context and so calls that transformer
 *         directly. one rule, two ways in — which is what makes `--org @this` answer identically
 *         on every sweep verb. a prior copy of the rule here let the two answers diverge
 * .note = `--org @all` returns before any read, so a machine-wide filter still touches no
 *         gitroot and no manifest (ehmpathy/rhachet#467)
 * .note.twin = keyrack decides "must i pay for a repo manifest?" in exactly TWO places, and
 *         they are deliberately different shapes. THIS one is the SWEEP gate: it keys on the
 *         filter value, because only `@this` names a repo. the other is the ASK gate —
 *         `getOneKeyrackRepoManifestForAsk` / `isKeyrackAskMachineWide` — used by the KEYED
 *         verbs (`get`, `source`, `unlock`, `set`, `del`), which key on the whole ask, since a
 *         full `@all.<env>.<name>` slug names its own org with no flag at all. a reader who
 *         greps for one idiom would otherwise never learn the second exists
 */
export const getOneKeyrackFilterOrg = async (input: {
  org: string | null;

  /**
   * .what = where the repo search begins, when one is needed at all
   * .why = injected rather than read from `process.cwd()` inside, so a test can name a
   *        directory instead of a global it must mutate and restore (rule.require.dependency-injection)
   */
  from: string;
}): Promise<string | null> => {
  // only `@this` names the repo, so it alone pays for a gitroot and a manifest read
  if (input.org !== '@this')
    return asKeyrackFilterOrg({ org: input.org, orgOfRepo: null });

  const gitroot = await getGitRepoRootOrNull({ from: input.from });
  const repoManifest = gitroot
    ? await daoKeyrackRepoManifest.get({ gitroot })
    : null;

  return asKeyrackFilterOrg({
    org: input.org,
    orgOfRepo: repoManifest?.org ?? null,
  });
};
