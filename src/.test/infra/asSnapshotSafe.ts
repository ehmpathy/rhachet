/**
 * .what = masks machine-local absolute paths in a message so a snapshot is portable
 * .why = a refusal quotes the absolute paths it weighed — the useful half of the message, and
 *        the half that differs per machine (`rule.require.mask-both-names-of-a-temp-dir`)
 *
 * .note = the longest path is masked first, so a dir nested inside another (a temp dir inside
 *   the repo root) keeps its own mask rather than a half-masked tail
 */
export const asSnapshotSafe = (input: {
  of: string;
  masks: { path: string; into: string }[];
}): string =>
  [...input.masks]
    .sort((a, b) => b.path.length - a.path.length)
    .reduce((text, mask) => text.split(mask.path).join(mask.into), input.of);
