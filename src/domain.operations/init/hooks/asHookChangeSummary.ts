/**
 * .what = the `+N, ~N, -N` change summary a hook sync row carries, or '' where naught changed
 * .why = a brain row and an actor row render the same shape (`rule.forbid.snapshot-visual-blemishes`),
 *        so the format has one owner
 */
export const asHookChangeSummary = (input: {
  created: number;
  updated: number;
  deleted: number;
}): string =>
  [
    input.created > 0 ? `+${input.created}` : null,
    input.updated > 0 ? `~${input.updated}` : null,
    input.deleted > 0 ? `-${input.deleted}` : null,
  ]
    .filter(Boolean)
    .join(', ');
