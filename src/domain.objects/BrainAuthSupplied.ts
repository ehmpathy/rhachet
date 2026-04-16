import { DomainLiteral } from 'domain-objects';

import type { BrainAuthCredential } from './BrainAuthCredential';

/**
 * .what = formatted credential output for a specific brain
 * .why = each brain expects credentials in different formats (claude: raw token, opencode: JSON)
 * .note = generic TFormat carries the brain slug literal for type safety
 */
export interface BrainAuthSupplied<TFormat extends string = string> {
  /**
   * the credential selected by spec
   */
  credential: BrainAuthCredential;

  /**
   * which brain this declaration is formatted for (type-safe)
   * @example 'anthropic/claude-code', 'opencode/opencode'
   */
  brainSlug: TFormat;

  /**
   * brain-specific formatted output
   * @example anthropic/claude-code: 'sk-ant-...'
   * @example opencode/opencode: '{"api_key": "sk-ant-..."}'
   */
  formatted: string;
}

export class BrainAuthSupplied<TFormat extends string = string>
  extends DomainLiteral<BrainAuthSupplied<TFormat>>
  implements BrainAuthSupplied<TFormat> {}
