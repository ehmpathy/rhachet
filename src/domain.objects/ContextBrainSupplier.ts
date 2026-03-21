/**
 * .what = generic context type for brain suppliers
 * .why = enables typed context injection for any brain supplier
 *
 * .example
 *   ContextBrainSupplier<'xai', BrainSuppliesXai>
 *   // expands to: { 'brain.supplier.xai'?: BrainSuppliesXai }
 *
 * .note
 *   - optional by mandate: forces consideration of context without supplier's supplies
 *   - no way to forget to handle the absent case
 */
export type ContextBrainSupplier<TSlug extends string, TSupplies> = {
  [K in `brain.supplier.${TSlug}`]?: TSupplies;
};
