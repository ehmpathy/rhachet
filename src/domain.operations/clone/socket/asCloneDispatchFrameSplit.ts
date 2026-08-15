/**
 * .what = reassemble newline-delimited wire frames from a stream of chunks — a
 *   SOCK_STREAM carries bytes, not messages, so one `say` may arrive split across
 *   reads, or two may arrive in one read
 * .why =
 *   - the socket is a byte stream: `.on('data')` fires with arbitrary chunk
 *     boundaries. a reader that treats each chunk as one message would split a
 *     large `say` or merge two small ones. this splits on the `\n` frame
 *     delimiter, yields the COMPLETE frames, and holds the incomplete tail as
 *     `rest` for the next chunk
 *   - the tail is BOUNDED: a sender that never sends a `\n` cannot grow the buffer
 *     forever — past `maxFrameBytes` the caller NACKs and closes, rather than
 *     accrue an unbounded backlog (rule.require.safe-by-default)
 *
 * .note = pure: the caller owns the buffer, feeds { buffered, chunk }, and gets
 *   back { frames, rest, overflow }. it re-feeds `rest` as the next `buffered`
 */
export const asCloneDispatchFrameSplit = (input: {
  buffered: string;
  chunk: string;
  maxFrameBytes: number;
}): { frames: string[]; rest: string; overflow: boolean } => {
  const combined = input.buffered + input.chunk;
  const parts = combined.split('\n');

  // the last part is the incomplete tail; each part before it is a whole frame
  const rest = parts.pop() ?? '';
  const frames = parts.filter((frame) => frame.length > 0);

  // the unfinished tail cannot grow past the cap without a delimiter — bound it
  const overflow = Buffer.byteLength(rest, 'utf8') > input.maxFrameBytes;

  return { frames, rest, overflow };
};
