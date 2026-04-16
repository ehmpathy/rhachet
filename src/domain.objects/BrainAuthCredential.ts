import { DomainLiteral } from 'domain-objects';

/**
 * .what = a specific auth credential from keyrack
 * .why = represents the token that will be used for brain API calls
 */
export interface BrainAuthCredential {
  /**
   * keyrack key slug that identifies this credential
   * @example 'ehmpathy/prod/ANTHROPIC_API_KEY_1'
   */
  slug: string;

  /**
   * the actual token value
   */
  token: string;
}

export class BrainAuthCredential
  extends DomainLiteral<BrainAuthCredential>
  implements BrainAuthCredential {}
