/**
 * .what = split a boot corpus into its path-keyed blocks: each `<tag path="…">…</tag>` or
 *         `<tag path="…"/>` that opens a line (indented within `<also>`, or not)
 * .why = a boot is a sequence of briefs, readmes, and skills, each named by its path. a delta
 *        between two boots is clearest per block — which brief changed, was added, or left —
 *        so a clone reads the briefs that drifted, never a line diff of the whole corpus
 *
 * .note = the key is `<tag> <path>`, so a brief seen as `say` in one boot and as `ref` in the
 *         next reads as one left and one added, which is what changed for the reader
 * .note = a block opens and closes at a line start; a tag a brief quotes mid-line (a code
 *         sample, a rule about the tags) is body text, never a block
 */
export const asBootBlocks = (input: {
  corpus: string;
}): { key: string; text: string }[] =>
  [
    ...input.corpus.matchAll(
      /^[ \t]*<([a-z][a-z.]*) path="([^"]*)"(?:\s*\/>|>[\s\S]*?^[ \t]*<\/\1>)/gm,
    ),
  ].map((match) => ({
    key: `${match[1]} ${match[2]}`,
    text: match[0].trim(),
  }));
