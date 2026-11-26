/**
 * .what = the input typed after an Enter, within the same read chunk
 * .why = a raw-mode prompt reads stdin a chunk at a time. a pasted "1⏎secret⏎", or two
 *   answers a pty delivers in one read, hands one prompt more than its line. the prompt
 *   takes its line; the rest belongs to the next reader, so it must go back onto stdin,
 *   never be dropped (a dropped answer leaves the next prompt to wait forever)
 *
 * .note = a CR followed by LF is one Enter: the LF is consumed with it, so a CRLF stream
 *   never hands the next prompt a bare LF that would end it empty
 */
export const asTypedAheadRest = (input: {
  chars: string[];
  index: number;
}): string => {
  const isCrlf =
    input.chars[input.index] === '\r' && input.chars[input.index + 1] === '\n';
  const restStart = input.index + (isCrlf ? 2 : 1);
  return input.chars.slice(restStart).join('');
};
