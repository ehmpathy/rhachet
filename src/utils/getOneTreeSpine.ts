/**
 * .what = the spine a treestruct row's CHILDREN indent by — `│  `, or `   ` under the last
 * .why = `getOneTreeElbow` owns the row's own glyph; this owns the column beneath it. the
 *        pair must agree — a `├─` row whose children indent by `   ` renders a gap in the
 *        spine.
 *
 * 🔴 .note = it takes the PARENT's position, never the child's. the column beneath a row is
 *   decided entirely by whether that row was last (`rule.forbid.inline-decode-friction`).
 *
 * ⚠️ the spine is 3 chars (`'│  '`), the width the elbow's own `├─ ` render aligns to. a
 *   4-char `'│   '` appears at extant inline sites and is forbidden here.
 */
export const getOneTreeSpine = (input: {
  index: number;
  length: number;
}): string => (input.index === input.length - 1 ? '   ' : '│  ');
