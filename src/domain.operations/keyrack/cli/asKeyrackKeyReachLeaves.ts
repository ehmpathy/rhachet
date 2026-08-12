import type { KeyrackKeyReach } from '@src/domain.objects/keyrack';
import { asKeyrackKeyReachExid } from '@src/domain.operations/keyrack/reach/asKeyrackKeyReachExid';

/**
 * .what = the `reach:` leaf of a key branch — one line when the key was cut for a reach,
 *         and NO line at all when it was not
 * .why = three renders emit this leaf (`unlock`, `status`, `list`), and each restated the
 *        same two invariants in its own words. one home states them once
 *
 * .note = the leaf's PLACEMENT is an invariant, not a taste: it sits directly after `org:`,
 *         because the two name a reach apiece — `org` the one a key is authorized FROM,
 *         `reach` the one it is authorized INTO. adjacent, so a human reads the pair together
 * .note = the connector is always `├─`, never `└─`. reach is never the last leaf of a branch
 *         on any of the three renders, so a terminal connector here would draw a broken tree
 * .note = an absent reach yields an EMPTY array, so a reachless branch is byte-identical to
 *         what it renders today — which is every key that exists (e1). that is why the return
 *         is `string[]` and not `string | null`: a caller spreads it and adds no branch
 */
export const asKeyrackKeyReachLeaves = (input: {
  indent: string;
  reach?: KeyrackKeyReach;
}): string[] => {
  if (!input.reach) return [];
  return [
    `${input.indent}├─ reach: ${asKeyrackKeyReachExid({ reach: input.reach })}`,
  ];
};
