import type { KeyrackKeyGrant } from '@src/domain.objects/keyrack/KeyrackKeyGrant';
import type { KeyrackKeyOmission } from '@src/domain.objects/keyrack/KeyrackKeyOmission';

/**
 * .what = the one ordered list an `unlock` render walks — every grant it won, then every row it
 *         omitted, each tagged with which of the two it is
 * .why = the render needs ONE sequence to number its tree connectors against (a branch has to
 *        know whether it is last), yet the two halves arrive as separate arrays of unrelated
 *        shape. the orchestrator built the union inline as a map + spread pipeline, which made a
 *        reader simulate the pipeline to learn what it produced
 *        (`rule.forbid.inline-decode-friction`)
 *
 * .note = ⚠️ the omission is NESTED under `omission`, never spread flat onto the tag. the flat
 *         shape put a row's own fields (`slug`, `reason`, `cause`, and now `reach`) at the same
 *         level as the discriminant, so a reader could not tell at a glance which field belongs
 *         to the render's own tag and which to the domain row it wraps
 * .note = order is a contract, not a convenience: grants first, then omissions, so a human reads
 *         what they got before what they did not. a snapshot asserts it
 */
export const asKeyrackUnlockRenderEntries = (input: {
  unlocked: KeyrackKeyGrant[];
  omitted: KeyrackKeyOmission[];
}): (
  | { type: 'unlocked'; grant: KeyrackKeyGrant }
  | { type: 'omitted'; omission: KeyrackKeyOmission }
)[] => [
  ...input.unlocked.map((grant) => ({ type: 'unlocked', grant }) as const),
  ...input.omitted.map((omission) => ({ type: 'omitted', omission }) as const),
];
