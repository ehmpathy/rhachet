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
 *   - supports both single and multiple threads per role
 *   - enables lookup of a thread by .role
 */
export type Threads<
  TContextDict extends Record<string, object> = Record<never, never>,
  TMultiplicity extends 'single' | 'multiple' = 'single',
> = {
  [K in keyof TContextDict & string]: TMultiplicity extends 'multiple'
    ? {
        /**
         * .what = the seed thread from which the peers originated
         * .why =
         *   - fanin operations need to know which thread to merge back into
         */
        seed: Thread<
          TContextDict[K] extends Empty
            ? ThreadContextRole<K>
            : ThreadContextRole<K> & TContextDict[K]
        >;

        /**
         * .what = the peer threads which multiplied from the seed
         * .why =
         *   - carries the thread history of the peer threads to the consumer (e.g., fanin)
         */
        peers: Thread<
          TContextDict[K] extends Empty
            ? ThreadContextRole<K>
            : ThreadContextRole<K> & TContextDict[K]
        >[];
      }
    : Thread<
        TContextDict[K] extends Empty
          ? ThreadContextRole<K>
          : ThreadContextRole<K> & TContextDict[K]
      >;
};
