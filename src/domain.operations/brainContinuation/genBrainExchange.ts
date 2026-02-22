import { BrainExchange } from '@src/domain.objects/BrainExchange';

import { computeBrainExchangeHash } from './computeBrainExchangeHash';

/**
 * .what = factory for BrainExchange with computed hash
 * .why = ensures hash is always content-derived, never caller-supplied
 *
 * .note = async for cross-platform portability
 */
export const genBrainExchange = async (input: {
  with: { input: string; output: string; exid: string | null };
}): Promise<BrainExchange> => {
  const hash = await computeBrainExchangeHash({
    input: input.with.input,
    output: input.with.output,
  });

  return new BrainExchange({
    hash,
    input: input.with.input,
    output: input.with.output,
    exid: input.with.exid,
  });
};
