import type { CloneAuthGateOutcome } from './awaitCloneAuthGate';

/**
 * .what = what the clone socket does with a connection's frames once its auth gate settles
 * .why = the four-way decision — NACK a timeout, NACK a deny, drop a caller that hung up, else
 *   process — lives here as a pure verdict, so each route is unit-tested with no socket, no
 *   `ss`, and no wall-clock wait (the same split as `computeCloneAcceptRoute`)
 * .note = a refusal outranks the hangup: a timeout or a deny NACKs even to a peer no longer
 *   writable (the write is a no-op there), so the trace of a refusal never hides behind a drop
 * .note = frame contract: a client holds its socket open until it reads its ack. a half-closed
 *   client is read as hung up — with `allowHalfOpen: false` the server ends its side too
 */
export const computeCloneAuthGateAction = (input: {
  verdict: CloneAuthGateOutcome['verdict'];
  peerWritable: boolean;
}): 'nack-timeout' | 'nack-denied' | 'drop-hung-up' | 'process' => {
  // refuse first: a gate that did not pass never processes a frame
  if (input.verdict === 'timeout') return 'nack-timeout';
  if (input.verdict === 'deny') return 'nack-denied';

  // a passed gate whose caller hung up already reported a wedge; a write now lands a say it
  //   believes failed, and its retry would type the message twice
  if (!input.peerWritable) return 'drop-hung-up';

  return 'process';
};
