import type { Empty } from 'type-fns';

import type { GStitcher, Stitcher } from '@src/domain.objects/Stitcher';
import type { Thread } from '@src/domain.objects/Thread';
import type { Threads } from '@src/domain.objects/Threads';

/**
 * .what = extracts the context (excluding `role`) from a Thread
 * .why = isolates the business-relevant part of a thread's context
 * .fallback = `Empty` if no keys besides `role`
 */
type ThreadContext<T> =
  T extends Thread<infer C>
    ? Omit<C, 'role'> extends infer R
      ? keyof R extends never
        ? Empty
        : R
      : never
    : never;

/**
 * .what = merges two thread context objects safely
 * .why = avoids `Empty` accidentally widening to `any`
 */
type MergeThreadContexts<A, B> = [A] extends [Empty]
  ? B
  : [B] extends [Empty]
    ? A
    : A & B;

/**
 * .what = merges two thread maps (e.g., from Threads<...>)
 * .why = produces a new thread map where overlapping roles have merged context
 */
type MergeTwoThreadMaps<
  A extends Record<string, Thread<any>>,
  B extends Record<string, Thread<any>>,
> = {
  [K in keyof A | keyof B]: K extends keyof A
    ? K extends keyof B
      ? Thread<
          {
            role: K;
          } & MergeThreadContexts<ThreadContext<A[K]>, ThreadContext<B[K]>>
        >
      : A[K]
    : K extends keyof B
      ? B[K]
      : never;
};

/**
 * .what = recursively merges a list of thread maps
 * .why = folds the list down left-to-right
 */
type MergeThreadList<T extends readonly Record<string, Thread<any>>[]> =
  T extends readonly [infer Head, ...infer Tail]
    ? Head extends Record<string, Thread<any>>
      ? Tail extends readonly Record<string, Thread<any>>[]
        ? MergeTwoThreadMaps<Head, MergeThreadList<Tail>>
        : Head
      : never
    : // eslint-disable-next-line @typescript-eslint/ban-types
      {};

/**
 * .what = merges threads together safely
 * .cases =
 *   - example.1
 *     - input
 *       ```ts
 *         type T1 = Threads<{ artist: Empty }>;
 *         type T2 = Threads<{ artist: { skills: string[] }, director: Empty }>;
 *         type T3 = Threads<{ director: { vision: string }, judge: Empty }>;
 *        ```
 *     - output
 *       ```ts
 *         type Merged = ThreadsMerged<[T1, T2, T3]>;
 *         // => Threads<{
 *         //   artist: { skills: string[] };
 *         //   director: { vision: string };
 *         //   judge: Empty;
 *         // }>
 *        ```
 */
export type ThreadsMerged<
  TList extends readonly [Threads<any, 'single'>, ...Threads<any, 'single'>[]], // !: enforces tuple of atleast one
> = Threads<
  {
    [K in keyof MergeThreadList<TList> & string]: ThreadContext<
      MergeThreadList<TList>[K]
    >;
  },
  'single'
>;

/**
 * .what = enables [...spread, plus] composition of threads tuple, pre merge
 */
export type ThreadsSpread<
  T extends readonly [Stitcher<GStitcher>, ...Stitcher<GStitcher>[]],
> = T extends readonly [
  infer A extends Stitcher<GStitcher>,
  ...infer R extends Stitcher<GStitcher>[],
]
  ? [
      A extends Stitcher<infer GA> ? GA['threads'] : never,
      ...{
        [K in keyof R]: R[K] extends Stitcher<infer GR> ? GR['threads'] : never;
      },
    ]
  : never;
