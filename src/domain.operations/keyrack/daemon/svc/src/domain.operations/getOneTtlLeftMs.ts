/**
 * .what = the milliseconds left before a grant expires, floored at zero
 * .why = names the ttl a status row reports, so the status map reads as a shape
 *
 * .note = `null` for a grant with no expiry, never `Infinity`: the wire is JSON, which
 *         cannot carry `Infinity` and rewrites it to `null`
 */
export const getOneTtlLeftMs = (input: {
  expiresAt: string | null;
  nowMs: number;
}): number | null =>
  input.expiresAt
    ? Math.max(0, new Date(input.expiresAt).getTime() - input.nowMs)
    : null;
