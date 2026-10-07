import type { BootBatch } from '@src/domain.operations/boot/BootBatch';
import type { BrainTokenCounter } from '@src/domain.operations/brainCost/getOneBrainTokenCounter';

/**
 * .what = one batch, with what it costs
 *
 * 🔴 .note = it carries NO `percent`. the renderer derives every share it prints from `tokens`
 *   via the single `asPercent` owner in `asBootCostReadout`, so a stored share would be a second
 *   statement of one derived quantity — and two statements of one fact agree until one is edited.
 */
export interface BootCostRow {
  slug: string;
  kind: 'say' | 'ref';
  tokens: number;
}

/**
 * .what = each batch's own token count, heaviest first
 * .why = the order IS the tune surface. an author asks "what do I cut?" and the answer is a
 *        list sorted by what each line actually costs the payload they just measured.
 *
 * ⚠️ .note = a per-batch count is exact for that batch's own text, and the batch counts do
 *   NOT sum to the payload total — a token can span the join between two batches, and the
 *   two stats blocks belong to no batch at all. so the headline total comes from
 *   `calcBootPayloadTokens` over the whole emitted string, never from this sum.
 *
 * 🔴 .note = the counter is INJECTED and no share is stored. the boundary is owned by
 *   `getOneBrainTokenCounter`, and every share is derived by `asPercent` from `tokens`
 *   (`rule.prefer.decomposable-architecture`).
 */
export const getAllCostRows = (
  input: { batches: BootBatch[] },
  context: { countTokens: BrainTokenCounter },
): BootCostRow[] =>
  input.batches
    .map((batch) => ({
      slug: batch.slug,
      kind: batch.kind,
      tokens: context.countTokens({ of: { words: batch.lines.join('\n') } })
        .tokens,
    }))
    .sort((a, b) => b.tokens - a.tokens);
