import type { KeyrackKeyReach } from '@src/domain.objects/keyrack';

/**
 * .what = one reach `fill` must provision for a key
 * .why = named once so the loop that walks the targets and the tally that counts them
 *        read from ONE definition — a count derived by its own arithmetic could drift
 *        from the loop it claims to describe, and the drift would show as a wrong
 *        progress total with no test to catch it
 *
 * .note = `reach` is absent — never null — on the reachless target, so the field matches
 *         the optional `reach?` that every address contract in keyrack carries (e16)
 */
export interface KeyrackFillTarget {
  reach?: KeyrackKeyReach;
}

/**
 * .what = the reaches `fill` must provision for one key
 * .why = a repo declares which reaches every developer here must hold, so the
 *        reachless key is always a target and each declared reach adds one beside it
 *
 * .note = a repo declares a MINIMUM, never a maximum — it can add a reach to fill,
 *         never take one away, so the reachless target is unconditional
 * .note = every target is equal in weight. a declared reach that cannot be provisioned
 *         halts `fill`, exactly as the reachless one does — the repo declared it, so the
 *         checkout does not work without it
 */
export const getAllKeyrackFillTargets = (input: {
  reaches: KeyrackKeyReach[];
}): KeyrackFillTarget[] => [{}, ...input.reaches.map((reach) => ({ reach }))];
