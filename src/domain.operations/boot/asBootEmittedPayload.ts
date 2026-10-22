import { asBootPayloadLogged } from './asBootPayloadLogged';

/**
 * .what = the EXACT bytes a boot puts on stdout — the assembled string plus its final newline
 * .why = a budget refuses a boot on this number, so it is measured over what is emitted
 *        rather than over what is assembled (`0.wish.md` requirement 7)
 *
 * 🔴 .note = the one `\n` is the whole reason this operation exists beside its peer. a
 *   counter that measures the bare string measures one byte fewer than the wire carries —
 *   an UNDERCOUNT, the one direction requirement 7 forbids, because it is the direction that
 *   lets an over-budget payload pass its gate.
 *
 * ⚠️ .note = this string is written AS IS (`emitBootPayloadDrained`), never through
 *   `console.log`, which would append a second newline and make the count the one that lies.
 */
export const asBootEmittedPayload = (input: {
  linesStats: string[];
  linesBody: string[];
}): string => asBootPayloadLogged(input) + '\n';
