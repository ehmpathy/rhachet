import type { BrainPlugToolDefinition } from '@src/domain.objects/BrainPlugToolDefinition';

/**
 * .what = mapped type that preserves per-slug tool types
 * .why = enables type-safe tool lookup by known slug literals
 *
 * for known slugs: returns the specific tool type
 * for unknown slugs: returns the union type | undefined
 */
export type BrainPlugToolDict<
  T extends readonly BrainPlugToolDefinition<any, any, any, any>[],
> = {
  [K in T[number] as K['slug']]: K;
} & Record<string, T[number] | undefined>;

/**
 * .what = converts an array of tools into a typed dictionary keyed by slug
 * .why = enables O(1) tool lookup by slug with per-slug type preservation
 *
 * .note = TSlug on BrainPlugToolDefinition enables per-slug type inference
 *
 * @example
 * const searchTool = genBrainPlugToolDeclaration({ slug: 'search', ... });
 * const calcTool = genBrainPlugToolDeclaration({ slug: 'calc', ... });
 *
 * const tools = [searchTool, calcTool] as const;
 * const toolDict = asBrainPlugToolDict(tools);
 *
 * // lookup by known slug - gets specific type
 * const search = toolDict['search'];  // typeof searchTool
 * const calc = toolDict['calc'];      // typeof calcTool
 *
 * // lookup by dynamic slug - gets union type
 * const tool = toolDict[invocation.slug];  // typeof searchTool | typeof calcTool | undefined
 */
export const asBrainPlugToolDict = <
  const T extends readonly BrainPlugToolDefinition<any, any, any, any>[],
>(
  tools: T,
): BrainPlugToolDict<T> => {
  const dict = {} as BrainPlugToolDict<T>;
  for (const tool of tools) {
    (dict as Record<string, T[number]>)[tool.slug] = tool;
  }
  return dict;
};
