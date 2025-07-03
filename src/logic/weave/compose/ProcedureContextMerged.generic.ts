/**
 * .what = transforms a union into an intersection of its members
 * .why = needed to merge multiple object types into one composite type (e.g. { foo } | { bar } → { foo } & { bar })
 */
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I,
) => void
  ? I
  : never;

/**
 * .what = removes all index signatures from an object type
 * .why = prevents `[x: string]: never` from polluting merged types when `Record<string, never>` is involved (like from `Empty`)
 */
type DropEmpty<T> = {
  [K in keyof T as string extends K
    ? never
    : number extends K
    ? never
    : symbol extends K
    ? never
    : K]: T[K];
};

/**
 * .what = merges a tuple of object types into one composite object type
 * .why = uses `UnionToIntersection` to combine all tuple elements, then removes any leftover index signatures (e.g. from `Record<string, never>`)
 */
type MergeUnion<T extends readonly any[]> = UnionToIntersection<
  T[number]
> extends infer I
  ? DropEmpty<{ [K in keyof I]: I[K] }>
  : never;

/**
 * .what = semantic alias for any object type used as a procedure context
 * .why = improves readability and conveys the intent of "context-like" shape
 */
type ProcedureContext<T extends Record<string, any>> = T;

/**
 * .what = merges a readonly tuple of one or more procedure contexts into a single composite context
 * .why = used to infer the combined required context from a sequence of stitchers
 */
export type ProcedureContextMerged<
  TList extends readonly [ProcedureContext<any>, ...ProcedureContext<any>[]],
> = MergeUnion<TList>;
