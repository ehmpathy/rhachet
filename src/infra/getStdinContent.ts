/**
 * .what = read the whole stdin as one utf8 string, optionally trimmed
 * .why = every stdin reader in the cli (clone say, enroll, keyrack set, keyrack firewall) needs
 *        the same read; one transformer keeps them from drift
 *
 * .note = `trim` is the one axis the readers differ on: a motive reads cleaner without edge
 *         whitespace; a message, a json payload, or a credential is kept verbatim
 * .note = context.stdin is injectable so a unit test reads a fixture stream, never the
 *         real process stdin
 */
export const getStdinContent = async (
  input: { trim: boolean },
  context?: { stdin?: AsyncIterable<unknown> },
): Promise<string> => {
  // collect every chunk off the stream
  // .note = deliberate mutation — a bounded accumulator local to this read; the array
  //         never escapes, so no external reader observes the mutation
  const stdin = context?.stdin ?? process.stdin;
  const chunks: Buffer[] = [];
  for await (const chunk of stdin)
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));

  // decode, trim when asked
  const text = Buffer.concat(chunks).toString('utf8');
  return input.trim ? text.trim() : text;
};
