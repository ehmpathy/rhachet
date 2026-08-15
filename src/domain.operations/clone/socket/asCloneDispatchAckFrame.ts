import type { CloneDispatchAck } from './asCloneDispatchAck';

/**
 * .what = serialize one two-phase ack into a newline-delimited json wire line
 * .why = the socket server writes acks back to the caller as one json object per
 *   line; this is the ONE serializer, paired with asCloneDispatchAck's parse, so
 *   the wire shape has a single owner both ways
 *
 * .note = pure: the final `\n` is the frame delimiter the reassembler splits on
 */
export const asCloneDispatchAckFrame = (input: {
  ack: CloneDispatchAck;
}): string => `${JSON.stringify(input.ack)}\n`;
