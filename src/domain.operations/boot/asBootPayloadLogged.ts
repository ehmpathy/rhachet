/**
 * .what = the string a boot hands to `console.log` — stats block, body, stats block
 * .why = the counter and the emitter must agree on the payload's bytes, and the only way to
 *        guarantee that is to assemble them ONCE (`rule.prefer.most-common-denominator`)
 *
 * 🔴 .note = its peer `asBootEmittedPayload` wraps this one and adds the single `\n` that
 *   `console.log` appends. the two differ by exactly one byte, and that byte is the whole
 *   reason both exist — so a change here lands on the counter and the wire together, which
 *   is the property the pair is built to hold.
 *
 * ⚠️ .note = this is the string to EMIT. its peer is the string to MEASURE. to log the peer
 *   would put two newlines on the wire and make the count the one that lies.
 */
export const asBootPayloadLogged = (input: {
  linesStats: string[];
  linesBody: string[];
}): string =>
  [...input.linesStats, ...input.linesBody, ...input.linesStats].join('\n');
