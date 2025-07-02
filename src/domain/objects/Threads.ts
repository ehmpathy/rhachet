import { Empty } from 'type-fns';

import { Thread } from './Thread';

/**
 * .what = a slug that uniquely identifies a role a thread can have
 */
export type ThreadRole = string;

/**
 * .what = a declaration of a role assigned to a thread
 * .note =
 *   - a core goal of rhachet is to make it easy to leverage roles in thought branches
 *   - given that each thread of thought is heavily contextualized based on its "role", .role is a core primitive of a thought thread, in reality
 */
export type ThreadContextRole<TThreadRole extends ThreadRole> = {
  role: TThreadRole;
};

/**
 * .what = a declaration of the available threads and their contexts
 * .note
 *   - ties a thread's key to its context via .role
 *   - enables lookup of a thread by .role
 */
export type Threads<
  TContextDict extends Record<string, object> = Record<never, never>,
> = {
  [K in keyof TContextDict & string]: Thread<
    TContextDict[K] extends Empty // exclude "empty" additional contexts
      ? ThreadContextRole<K>
      : ThreadContextRole<K> & TContextDict[K]
  >;
};
