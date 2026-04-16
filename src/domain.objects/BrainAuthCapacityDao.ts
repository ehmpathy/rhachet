import type { BrainAuthCapacity } from './BrainAuthCapacity';
import type { BrainAuthCredential } from './BrainAuthCredential';

/**
 * .what = dao interface contract for brain auth capacity queries
 * .why = enables capacity status lookup for credentials to select best available
 *
 * .note = uses method syntax for bivariance (see define.bivariance-for-generics)
 */
export interface BrainAuthCapacityDao {
  get: {
    /**
     * get capacity for a single credential
     */
    one(input: { credential: BrainAuthCredential }): Promise<BrainAuthCapacity>;

    /**
     * get capacity for all credentials (for pool rotation)
     */
    all(input: {
      credentials: BrainAuthCredential[];
    }): Promise<BrainAuthCapacity[]>;
  };
}
