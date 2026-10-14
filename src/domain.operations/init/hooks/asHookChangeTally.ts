/**
 * .what = the hook keys one derivation added, changed, and removed
 * .why = a before/after pair of hook maps (key → body) reads as three lists, so the actor
 *        row can carry the same +N/~N/-N summary the brain rows do
 *
 * .note = a key present in both maps with a different body is a change; the same body is
 *   no change at all
 */
export const asHookChangeTally = (input: {
  before: Map<string, string>;
  after: Map<string, string>;
}): { created: string[]; updated: string[]; deleted: string[] } => ({
  created: [...input.after.keys()].filter((key) => !input.before.has(key)),
  updated: [...input.after.keys()].filter(
    (key) =>
      input.before.has(key) && input.before.get(key) !== input.after.get(key),
  ),
  deleted: [...input.before.keys()].filter((key) => !input.after.has(key)),
});
