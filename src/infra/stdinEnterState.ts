/**
 * .what = whether the last raw-mode prompt ended on a CR that closed its chunk
 * .why = a CRLF pair can split across two chunks. the CR ends one prompt; its LF then opens
 *   the next chunk, and the next prompt would read that LF as an Enter with an empty answer.
 *   a prompt that sees this flag set drops one LF that opens its first chunk
 *
 * .note = deliberate mutation: one flag for the whole process, since stdin is one stream and
 *   every raw-mode prompt reads from it in turn (promptLineInput, promptHiddenInput)
 */
export const stdinEnterState: { isLfOfCrAwaited: boolean } = {
  isLfOfCrAwaited: false,
};

/**
 * .what = the chars of a raw-mode chunk, less one LF that closes a CRLF the prior prompt split
 * .why = both prompts read the same stream, so both take the same cut
 */
export const asCharsOfChunkAfterSplitCrlf = (input: {
  chunk: string;
}): string[] => {
  // the flag holds for one chunk only: the first chunk after the CR either opens with its LF, or
  //   the pair was never a pair
  const isLfOfPriorCr =
    stdinEnterState.isLfOfCrAwaited && input.chunk.startsWith('\n');
  stdinEnterState.isLfOfCrAwaited = false;
  return Array.from(isLfOfPriorCr ? input.chunk.slice(1) : input.chunk);
};
