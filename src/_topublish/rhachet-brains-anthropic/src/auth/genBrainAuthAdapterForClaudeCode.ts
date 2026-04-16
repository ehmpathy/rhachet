import type { BrainAuthAdapter } from '@src/domain.objects/BrainAuthAdapter';
import type { BrainAuthCapacity } from '@src/domain.objects/BrainAuthCapacity';
import type { BrainAuthSupplied } from '@src/domain.objects/BrainAuthSupplied';

/**
 * .what = creates a claude code brain auth adapter
 * .why = enables rhachet to supply auth credentials with pool rotation
 *
 * .note = this adapter implements round-robin rotation for the spike
 *         capacity-based selection can be added later via Anthropic rate limit headers
 */
export const genBrainAuthAdapterForClaudeCode =
  (): BrainAuthAdapter<'anthropic/claude-code'> => {
    return {
      slug: 'anthropic/claude-code',

      capacity: {
        get: {
          /**
           * .what = get capacity for a single credential
           * .why = enables selection of credential with most capacity
           *
           * .note = for spike, returns placeholder capacity
           *         real implementation would call Anthropic API to check rate limits
           */
          async one(query): Promise<BrainAuthCapacity> {
            const { credential } = query;

            // placeholder: return full capacity
            // real implementation would:
            // 1. make a lightweight API call with this credential
            // 2. parse x-ratelimit-left-tokens header
            // 3. return actual capacity
            return {
              credential: { slug: credential.slug },
              tokens: {
                unit: 'percentage',
                used: 0,
                limit: 100,
                left: 100,
              },
              refreshAt: null,
            };
          },

          /**
           * .what = get capacity for all credentials in pool
           * .why = enables round-robin selection across pool
           */
          async all(query): Promise<BrainAuthCapacity[]> {
            const { credentials } = query;
            const capacities: BrainAuthCapacity[] = [];

            for (const credential of credentials) {
              const capacity = await this.one({ credential });
              capacities.push(capacity);
            }

            return capacities;
          },
        },
      },

      auth: {
        /**
         * .what = format credential for claude-code
         * .why = claude-code expects raw API token, not JSON
         */
        async supply(
          query,
        ): Promise<BrainAuthSupplied<'anthropic/claude-code'>> {
          const { credential } = query;

          // claude-code expects just the raw token
          return {
            credential,
            brainSlug: 'anthropic/claude-code',
            formatted: credential.token,
          };
        },
      },
    };
  };
