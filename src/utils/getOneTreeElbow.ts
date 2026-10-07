/**
 * .what = the elbow a treestruct row takes at a given position — `├─`, or `└─` at the last
 * .why = the glyph pair is a CONTRACT rather than a local style choice — pinned by snapshots,
 *        graded by `rule.forbid.snapshot-visual-blemishes`. one owner makes a change to the
 *        pair land everywhere at once.
 *
 * 🔴 .note = the caller states the POSITION, never the verdict. an `isLast` boolean computed
 *   at the call site is the same arithmetic one hop out, so it moves the decode-friction
 *   rather than removes it (`rule.forbid.inline-decode-friction`).
 *
 * ⚠️ `elbow` is the canonical word for this glyph; `prefix`, `connector`, `branch`, and
 *   `marker` name the same concept elsewhere in the repo and are forbidden here
 *   (`rule.forbid.domain-term-inconsistency`).
 */
export const getOneTreeElbow = (input: {
  index: number;
  length: number;
}): string => (input.index === input.length - 1 ? '└─' : '├─');
