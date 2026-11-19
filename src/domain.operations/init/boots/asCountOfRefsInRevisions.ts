/**
 * .what = how many clone refs name one of the given revisions
 * .why = each ref is one clone, so the count is how many clones a re-written revision reaches
 */
export const asCountOfRefsInRevisions = (input: {
  refs: string[];
  revisions: string[];
}): number => input.refs.filter((ref) => input.revisions.includes(ref)).length;
