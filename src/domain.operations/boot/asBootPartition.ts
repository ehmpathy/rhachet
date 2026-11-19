/**
 * .what = split a boot corpus, in one pass, into its path-keyed blocks and the lines that sit
 *         outside every block: each `<tag path="…">…</tag>` or `<tag path="…"/>` that opens a
 *         line (indented within `<also>`, or not) is a block; the rest is the residual
 * .why = a boot is a sequence of briefs, readmes, and skills, each named by its path. a delta
 *        between two boots is clearest per block — which brief changed, was added, or left —
 *        and a byte change outside the blocks (a wrapper, a header, the cache boundary) is drift
 *        no block can carry, so the delta names it too
 *
 * .note = the key is `<tag> <path>`, so a brief seen as `say` in one boot and as `ref` in the
 *         next reads as one left and one added, which is what changed for the reader
 * .note = a block opens and closes at a line start; a tag a brief quotes mid-line (a code
 *         sample, a rule about the tags) is body text, never a block
 * .note = one regex pass: the residual is the text between matches, sliced by match index, so the
 *         cost is linear in the corpus, whatever the count of blocks
 * .note = residual lines are trimmed, and blank ones dropped
 */
export const asBootPartition = (input: {
  corpus: string;
}): {
  blocks: { key: string; tag: string; text: string }[];
  residual: string[];
} => {
  // every block, with where it sits in the corpus
  const matches = [
    ...input.corpus.matchAll(
      /^[ \t]*<([a-z][a-z.]*) path="([^"]*)"(?:\s*\/>|>[\s\S]*?^[ \t]*<\/\1>)/gm,
    ),
  ];

  // the text between blocks, and after the last
  const gaps = matches.map((match, at) =>
    input.corpus.slice(
      at === 0 ? 0 : matches[at - 1]!.index + matches[at - 1]![0].length,
      match.index,
    ),
  );
  const last = matches.at(-1);
  const tail = input.corpus.slice(
    last === undefined ? 0 : last.index + last[0].length,
  );

  return {
    blocks: matches.map((match) => ({
      key: `${match[1]} ${match[2]}`,
      tag: match[1]!,
      text: match[0].trim(),
    })),
    residual: [...gaps, tail]
      .join('\n')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0),
  };
};
