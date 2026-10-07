import { asBootPayloadLogged } from './asBootPayloadLogged';

/**
 * .what = the EXACT bytes a boot puts on stdout — the logged string plus the newline
 *         `console.log` appends
 * .why = a budget refuses a boot on this number, so it is measured over what is emitted
 *        rather than over what is assembled (`0.wish.md` requirement 7)
 *
 * 🔴 .note = the one `\n` is the whole reason this operation exists beside its peer.
 *   `console.log` appends exactly one newline, so a counter that measures the LOGGED string
 *   measures one byte fewer than the wire carries. that gap is an UNDERCOUNT — the one
 *   direction requirement 7 forbids, because it is the direction that lets an over-budget
 *   payload pass its gate.
 *
 * ⚠️ .note = do NOT emit this string. it already ends in a newline, so `console.log` would
 *   put two on the wire and the count would then be the one that lies. the emitter logs
 *   `asBootPayloadLogged`; this operation exists to say what that log actually costs.
 */
export const asBootEmittedPayload = (input: {
  linesStats: string[];
  linesBody: string[];
}): string => asBootPayloadLogged(input) + '\n';
