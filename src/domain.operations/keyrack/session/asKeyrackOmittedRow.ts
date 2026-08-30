import type { KeyrackKeyHost } from '@src/domain.objects/keyrack/KeyrackKeyHost';
import type { KeyrackKeyOmission } from '@src/domain.objects/keyrack/KeyrackKeyOmission';

/**
 * .what = build the one omission row an unlock files when a target could not be granted
 * .why = the row must carry the reach of the target it reports on, and three call sites in one
 *   loop (`remote`, `lost`, `errored`) each hand-wrote the same conditional spread. three copies
 *   of one shape is past the rule-of-three bar, and each could drift apart — a future site that
 *   dropped the reach would re-open the byte-identical-row ambiguity this very repair just closed
 *
 * .note = the reach is read off the HOST the target resolved to, never re-derived after the fact,
 *   so a row always names the reach that actually failed rather than a peer that did not
 * .note = the reach is OMITTED, never set to undefined, when the host carries none — so a
 *   reachless row is byte-identical to what it has always rendered and no extant snapshot moves
 */
export const asKeyrackOmittedRow = (input: {
  slug: string;
  reason: KeyrackKeyOmission['reason'];
  host?: KeyrackKeyHost;
  cause?: unknown;
}): KeyrackKeyOmission => ({
  slug: input.slug,
  reason: input.reason,
  ...(input.cause === undefined ? {} : { cause: input.cause }),
  ...(input.host?.reach ? { reach: input.host.reach } : {}),
});
