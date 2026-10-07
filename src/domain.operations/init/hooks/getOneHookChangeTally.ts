/**
 * .what = the created/updated/deleted hook counts summed across a set of role→brain applies
 * .why = the repo-root sync and each actor's sync report the same `+N/~N/-N` shape, so the
 *        fold over the applies has one owner rather than three inline reduces per site
 */
export const getOneHookChangeTally = (input: {
  applied: {
    hooks: { created: unknown[]; updated: unknown[]; deleted: unknown[] };
  }[];
}): { created: number; updated: number; deleted: number } =>
  input.applied.reduce(
    (tally, one) => ({
      created: tally.created + one.hooks.created.length,
      updated: tally.updated + one.hooks.updated.length,
      deleted: tally.deleted + one.hooks.deleted.length,
    }),
    { created: 0, updated: 0, deleted: 0 },
  );
