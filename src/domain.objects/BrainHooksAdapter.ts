import type { BrainHooksAdapterDao } from './BrainHooksAdapterDao';

/**
 * .what = adapter contract that wraps DAO with slug identifier
 * .why = brain suppliers implement this interface to support hook sync
 *
 * .note = slug identifies the brain (e.g., "claudecode", "opencode")
 */
export interface BrainHooksAdapter {
  slug: string;
  dao: BrainHooksAdapterDao;
}
