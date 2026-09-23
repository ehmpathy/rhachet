import type { CloneGetReply } from './asCloneGetReply';

/**
 * .what = serialize one get reply into a newline-delimited json wire line
 * .why = the socket server writes a get reply back to the caller as one json object per
 *   line; this is the ONE serializer, paired with asCloneGetReply's parse, so the wire
 *   shape has a single owner both ways
 *
 * .note = pure: the final `\n` is the frame delimiter the reassembler splits on
 */
export const asCloneGetReplyFrame = (input: { reply: CloneGetReply }): string =>
  `${JSON.stringify(input.reply)}\n`;
