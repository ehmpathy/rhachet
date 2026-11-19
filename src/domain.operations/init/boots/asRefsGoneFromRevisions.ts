/**
 * .what = each distinct clone ref that names no revision on disk
 * .why = a clone whose revision is gone takes no drift; each gone revision is named once
 */
export const asRefsGoneFromRevisions = (input: {
  refs: string[];
  revisions: string[];
}): string[] =>
  [...new Set(input.refs)].filter((ref) => !input.revisions.includes(ref));
