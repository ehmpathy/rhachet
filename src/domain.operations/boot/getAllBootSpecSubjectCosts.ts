import type { BootSource } from '@src/domain.operations/boot/BootSource';
import { calcBootPayloadTokens } from '@src/domain.operations/boot/calcBootPayloadTokens';
import { genBootPayload } from '@src/domain.operations/boot/genBootPayload';
import type { BrainTokenCounter } from '@src/domain.operations/brainCost/getOneBrainTokenCounter';

/**
 * .what = what a boot focused on each one subject costs, in declaration order
 * .why = a role may be enrolled at a focus (`mechanic::101`), and that boot spends the
 *        subject's tokens rather than the whole role's. it prices each focus with the same
 *        render and the same counter `roles boot --subject` uses, so a focus row agrees with
 *        the gate a focused boot meets
 *
 * .note = sequential, for the reason the repo sweep is: one encoder, and no interleaved warns
 * .note = a subject that renders naught costs 0 rather than drop its row, so the roster still
 *   names every subject a seat could focus
 */
export const getAllBootSpecSubjectCosts = async (
  input: { source: BootSource; slugs: string[] },
  context: { countTokens: BrainTokenCounter },
): Promise<{ slug: string; tokens: number }[]> => {
  // .note = DELIBERATE MUTATION — a sequential-await accumulator, scoped to this function
  const costs: { slug: string; tokens: number }[] = [];
  for (const slug of input.slugs) {
    const payload = await genBootPayload({
      source: input.source,
      subjects: [slug],
    });
    const tokens = payload
      ? calcBootPayloadTokens(
          { of: payload },
          { countTokens: context.countTokens },
        ).tokens
      : 0;
    costs.push({ slug, tokens });
  }
  return costs;
};
