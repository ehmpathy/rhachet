import { MalfunctionError } from 'helpful-errors';

/**
 * .what = the two-phase acknowledgement a clone's socket server sends back for a
 *   dispatched message
 * .why = a `say` needs to tell three outcomes apart — the server took the message
 *   into its queue (`queued`), it reached the brain's input (`delivered`), or it
 *   was refused (`rejected`, with a reason). the `delivered` phase is what arms
 *   sayClone's wedged-timeout only on the in-flight window, so a busy-but-healthy
 *   brain is never falsely reported wedged
 */
export type CloneDispatchAckPhase = 'queued' | 'delivered' | 'rejected';

export interface CloneDispatchAck {
  phase: CloneDispatchAckPhase;
  reason: string | null;
}

const PHASES: CloneDispatchAckPhase[] = ['queued', 'delivered', 'rejected'];

/**
 * .what = parse one newline-delimited ack line back into a typed ack
 * .why = sayClone reads the server's ack stream; this is the ONE parse, so a
 *   malformed ack fails loud (a real wire defect) rather than read as a silent
 *   wrong phase
 *
 * .note = a bad json line, or an unknown phase, is a MalfunctionError — the wire
 *   is our own protocol, so a break is a defect to fix, not a caller fault
 */
export const asCloneDispatchAck = (input: {
  line: string;
}): CloneDispatchAck => {
  // .note = deliberate mutation — assigned once inside the try (a JSON.parse that
  //   may throw on corrupt bytes); bounded to this scope, never escapes this function
  let parsed: { phase?: unknown; reason?: unknown };
  try {
    parsed = JSON.parse(input.line);
  } catch (error) {
    return MalfunctionError.throw('clone dispatch ack is not valid json', {
      line: input.line,
      cause: error instanceof Error ? error : undefined,
    });
  }

  if (!PHASES.includes(parsed.phase as CloneDispatchAckPhase))
    return MalfunctionError.throw('clone dispatch ack has an unknown phase', {
      line: input.line,
      phase: parsed.phase,
    });

  return {
    phase: parsed.phase as CloneDispatchAckPhase,
    reason: typeof parsed.reason === 'string' ? parsed.reason : null,
  };
};
