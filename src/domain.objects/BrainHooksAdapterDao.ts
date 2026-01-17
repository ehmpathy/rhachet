import type { RefByUnique } from 'domain-objects';
import type { PickOne } from 'type-fns';

import type { BrainHook } from './BrainHook';
import type { BrainHookEvent } from './BrainHookEvent';

/**
 * .what = DAO interface contract for brain hooks CRUD operations
 * .why = enables declastruct pattern with idempotent get/set/del semantics
 *
 * .note = uses method syntax for bivariance (see define.bivariance-for-generics)
 */
export interface BrainHooksAdapterDao {
  get: {
    one(input: {
      by: { unique: RefByUnique<typeof BrainHook> };
    }): Promise<BrainHook | null>;
    all(input?: {
      by?: PickOne<{ author: string; event: BrainHookEvent; command: string }>;
    }): Promise<BrainHook[]>;
  };
  set: {
    findsert(input: { hook: BrainHook }): Promise<BrainHook>;
    upsert(input: { hook: BrainHook }): Promise<BrainHook>;
  };
  del(input: { by: { unique: RefByUnique<typeof BrainHook> } }): Promise<void>;
}
