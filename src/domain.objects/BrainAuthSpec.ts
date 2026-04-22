/**
 * .what = raw spec string for brain auth configuration
 * .why = portable CLI input format that parses to BrainAuthSpecShape
 *
 * .format = 'strategy(source)' or just 'source' for default strategy
 * .example = 'pool(keyrack://ehmpathy/prod/ANTHROPIC_API_KEY_*)'
 * .example = 'keyrack://ehmpathy/prod/ANTHROPIC_API_KEY_1' (default strategy)
 */
export type BrainAuthSpecWords = string;

/**
 * .what = parsed structure of a brain auth spec
 * .why = typed shape after parse, used by orchestrators
 *
 * .note = strategy determines selection behavior:
 *   - 'default': use first available token
 *   - 'solo': use exactly one token (source must be exact)
 *   - 'pool': rotate across multiple tokens by capacity
 */
export interface BrainAuthSpecShape {
  /**
   * .what = token selection strategy
   */
  strategy: 'default' | 'solo' | 'pool';

  /**
   * .what = keyrack URI pattern for token(s)
   * .format = 'keyrack://owner/env/KEY_PATTERN'
   * .example = 'keyrack://ehmpathy/prod/ANTHROPIC_API_KEY_*'
   * .note = null when strategy is 'default' and no source provided
   */
  source: string | null;
}
