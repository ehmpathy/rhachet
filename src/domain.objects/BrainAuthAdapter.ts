import type { BrainAuthAdapterDao } from './BrainAuthAdapterDao';
import type { BrainAuthCapacityDao } from './BrainAuthCapacityDao';

/**
 * .what = adapter contract that wraps auth daos with brain identifier
 * .why = brain suppliers implement this interface to support auth rotation
 *
 * .note = slug identifies the brain (e.g., "anthropic/claude-code", "opencode/opencode")
 */
export interface BrainAuthAdapter<TBrainSlug extends string = string> {
  /**
   * brain identifier for type-safe match
   * @example 'anthropic/claude-code'
   */
  slug: TBrainSlug;

  /**
   * dao for credential capacity lookup
   */
  capacity: BrainAuthCapacityDao;

  /**
   * dao for formatted credential supply
   */
  auth: BrainAuthAdapterDao;
}
