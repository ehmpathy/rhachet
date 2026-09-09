import type { PickOne } from 'type-fns';

import { asKeyrackAskOrg } from './asKeyrackAskOrg';

/**
 * .what = is this whole ASK machine-wide, so no repo manifest can speak to it?
 * .why = a machine-wide credential is a fact about the box, never about a repo. so a repo
 *        manifest load buys no answer for such an ask AND inherits every way it can fail —
 *        invalid yaml, invalid schema, a circular extends, an absent extends target
 *
 * .note = tests POSITIVELY for '@all', never negatively for '@this'. a negative test reads the
 *         sdk's `undefined` (an ask with no org) as machine-wide, which would skip the load for
 *         every sdk ask that omits `org` and silently retire the ORG_MISMATCH guard. the two
 *         error directions are not alike: to understate costs one wasted load, to overstate
 *         disables a provenance check
 */
export const isKeyrackAskMachineWide = (input: {
  /**
   * .what = the ask's selector, and the provenance the caller named
   * .why = REQUIRED-nullable, per `rule.forbid.undefined-inputs`, and mirrored from
   *        asKeyrackAskOrg so the two cannot drift. a load site that forgets to thread the
   *        ask must fail to compile rather than read a silent `false` — the safe direction
   *        costs a wasted manifest load, but it also reinstates the very defect this
   *        predicate exists to close (ehmpathy/rhachet#467)
   */
  for: PickOne<{ keys: string[]; repo: true }> | null;
  org: string | null;
}): boolean => asKeyrackAskOrg(input) === '@all';
