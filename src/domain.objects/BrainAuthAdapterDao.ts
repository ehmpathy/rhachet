import type { BrainAuthCredential } from './BrainAuthCredential';
import type { BrainAuthSupplied } from './BrainAuthSupplied';

/**
 * .what = dao interface contract for brain auth supply operations
 * .why = enables credential format conversion for specific brain providers
 *
 * .note = uses method syntax for bivariance (see define.bivariance-for-generics)
 */
export interface BrainAuthAdapterDao {
  /**
   * format a credential for this brain's expected format
   * @example anthropic/claude-code expects raw token
   * @example opencode/opencode expects JSON config
   */
  supply(input: {
    credential: BrainAuthCredential;
  }): Promise<BrainAuthSupplied>;
}
