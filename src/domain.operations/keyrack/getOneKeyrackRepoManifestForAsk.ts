import type { PickOne } from 'type-fns';

import { daoKeyrackRepoManifest } from '@src/access/daos/daoKeyrackRepoManifest';
import type { KeyrackRepoManifest } from '@src/domain.objects/keyrack/KeyrackRepoManifest';

import { isKeyrackAskMachineWide } from './isKeyrackAskMachineWide';

/**
 * .what = load the repo manifest for an ask, or skip the load when the ask will not consult it
 * .why = this is THE decision ehmpathy/rhachet#467 is about, and it was spelled at three
 *        independent sites: the get-context builder, the cli repo-scope operation, and the
 *        second heavy-context load on the unlock-escalation path. the predicate beneath it was
 *        already shared — but the WRAPPER around it was not, and "a rule spelled N times is a
 *        rule that drifts" is the very argument this wish makes one level down
 *
 * ⚠️ .why.skip = a load this ask never reads is not merely wasted i/o — it INHERITS every way
 *              that load can fail. a repo manifest has four throw modes (invalid yaml, invalid
 *              schema, a circular `extends`, an absent `extends` target), and each one turns a
 *              correct machine-wide read into a refusal. that is the reported defect
 *
 * .note = the two skips are NOT the same question, and to conflate them was the original defect:
 *         - a null gitroot asks "is there a repo?"
 *         - a machine-wide ask asks "will this ask consult one?"
 *         they agree everywhere anyone tested, and diverge exactly where the defect lives — a
 *         repo present, holding a manifest that cannot hydrate
 * .note = an ask that states neither (`for: null, org: null`) is never machine-wide, so an
 *         untold caller loads the manifest exactly as it did before this operation existed
 * .note.twin = keyrack decides "must i pay for a repo manifest?" in exactly TWO places, and
 *         they are deliberately different shapes. THIS one is the ASK gate, used by the KEYED
 *         verbs (`get`, `source`, `unlock`, `set`, `del`) — it reads the whole ask, since a full
 *         `@all.<env>.<name>` slug names its own org with no flag at all. the other is the SWEEP
 *         gate — `getOneKeyrackFilterOrg` — used by `list` and `status`, which key on the filter
 *         value alone, because only `@this` names a repo there. a reader who greps for one idiom
 *         would otherwise never learn the second exists
 */
export const getOneKeyrackRepoManifestForAsk = async (input: {
  /** .what = the repo root, or null when the cwd is not a git repo at all */
  gitroot: string | null;

  /** .what = the scope the ask names — one key, the whole repo, or unstated */
  for: PickOne<{ keys: string[]; repo: true }> | null;

  /** .what = the `--org` value the caller named, or null when the flag was omitted */
  org: string | null;
}): Promise<KeyrackRepoManifest | null> => {
  if (!input.gitroot) return null;
  if (isKeyrackAskMachineWide({ for: input.for, org: input.org })) return null;
  return daoKeyrackRepoManifest.get({ gitroot: input.gitroot });
};
