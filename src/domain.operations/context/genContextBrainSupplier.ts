import type { ContextBrainSupplier } from '@src/domain.objects/ContextBrainSupplier';

/**
 * .what = factory to create typed brain supplier contexts
 * .why = provides pit-of-success for context construction
 *
 * .example
 *   const context = genContextBrainSupplier('xai', {
 *     creds: async () => ({ XAI_API_KEY: await vault.get('XAI_API_KEY') }),
 *   });
 *   // returns: { 'brain.supplier.xai': { creds: ... } }
 *
 * .note
 *   - supplier slug becomes the namespaced key
 *   - supplies value is the context payload
 *   - the cast is required due to typescript computed property key limitation
 */
export const genContextBrainSupplier = <TSlug extends string, TSupplies>(
  supplier: TSlug,
  supplies: TSupplies,
): ContextBrainSupplier<TSlug, TSupplies> => {
  return {
    [`brain.supplier.${supplier}`]: supplies,
  } as ContextBrainSupplier<TSlug, TSupplies>;
};
