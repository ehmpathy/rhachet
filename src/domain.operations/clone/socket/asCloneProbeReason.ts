import type { CloneGetReply, CloneProbeBlindReason } from './asCloneGetReply';

/**
 * .what = map a probe reply to its probe-blind reason — null when the read was capable
 * .why = a capable read carries a live input state, so it has no probe-blind reason (null); an
 *   unsupported reply carries the cause the `unreadable` degrade copy branches on (wait vs
 *   re-enroll). one owner of the reply→reason shape, so the observe loop reads a named call
 *   rather than an inline `probe === 'capable' ? null : reply.reason` ternary (r3/r4-n) — the
 *   peer of `asCloneObservationScreen`'s reply→screen derivation
 */
export const asCloneProbeReason = (input: {
  reply: CloneGetReply;
}): CloneProbeBlindReason | null =>
  input.reply.probe === 'capable' ? null : input.reply.reason;
