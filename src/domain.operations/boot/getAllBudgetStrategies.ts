/**
 * .what = one rung of the ladder of loss — a verb and the gloss that teaches it
 * .why = the halt's whole vocabulary of remedy is these verbs, so they are a declared shape
 *        rather than a positional tuple a reader must decode by index
 */
export interface BudgetStrategy {
  verb: string;
  gloss: string;
}

/**
 * .what = the ladder of loss a breach offers, in order, for a given boot mode
 * .why = the ORDER is the pit of success, so it is computed in one named place rather than
 *        assembled inline beside the render it feeds.
 *
 * .note = the sort key is what the remedy costs the READER, never what it costs the author
 *   to type:
 *     - `narrow`     costs naught — no doc is touched at all; the author asks for less of a
 *                    spec that stays entirely intact. a rung BELOW catalogize
 *     - `catalogize` costs naught — the set survives, indexed
 *     - `condense`   costs naught — the doc survives, compressed; the renderer prefers `.min`
 *     - `reference`  costs one dereference — the doc survives, off the resident set
 *     - `eliminate`  costs the document's boot — a `not` glob drops it from the payload, roster
 *                    line and all, while the file stays on disk for a direct read
 *
 * .note = a ref costs its line in the roster block, since the gate counts the full emitted
 *   payload; so the `reference` gloss names a cost, never zero
 *
 * ⇒ an author who reads top-down meets a lossless remedy before a lossy one, which a list
 *   sorted any other way would invert.
 */
export const getAllBudgetStrategies = (input: {
  mode: 'simple' | 'subject';
}): BudgetStrategy[] => [
  // 🔴 `narrow` heads the ladder, never joins its end. it is the one remedy that touches no
  //    document, so it is the cheapest rung there is
  ...(input.mode === 'subject'
    ? [{ verb: 'narrow', gloss: 'boot fewer --subject sections' }]
    : []),
  {
    verb: 'catalogize',
    gloss: 'replace a set with one catalog that indexes it',
  },
  { verb: 'condense', gloss: 'author an x.md.min beside x.md' },
  {
    verb: 'reference',
    gloss:
      'move a say entry to ref (it stays addressable, costs its path line)',
  },
  {
    verb: 'eliminate',
    gloss: 'list what does not earn its boot under `not` (the file stays)',
  },
];
