/**
 * .what = the `✨ hooks` summary rows, one per nonzero total
 * .why = a zero total renders no row, so the summary names only what changed
 */
export const asHookSyncTotalRows = (input: {
  created: number;
  updated: number;
  deleted: number;
  orphansRemoved: number;
}): string[] =>
  [
    { count: input.created, label: 'created' },
    { count: input.updated, label: 'updated' },
    { count: input.deleted, label: 'deleted' },
    { count: input.orphansRemoved, label: 'orphans removed' },
  ]
    .filter((total) => total.count > 0)
    .map((total) => `${total.count} ${total.label}`);
