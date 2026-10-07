import { getOneBrainTokenEncoder } from './getOneBrainTokenEncoder';

/**
 * .what = calculates token count for words via BPE tokenizer
 * .why = enables cost estimation for budgets and plans
 *
 * .note = uses js-tiktoken with o200k_base encoder (gpt-4o compatible)
 *   - exact for that token vocabulary
 *   - approximate across other model families
 *
 * .note = the encoder is shared process-wide (`getOneBrainTokenEncoder`) rather than
 *         constructed here. construction is ~1,800ms and input-invariant, so a
 *         construction per call charged that to every caller — `calcBrainOutputCost`
 *         calls this four times in one function.
 */
export const calcBrainTokens = (input: {
  of: { words: string };
}): { chars: number; tokens: number } => {
  const chars = input.of.words.length;
  const enc = getOneBrainTokenEncoder();
  const tokens = enc.encode(input.of.words).length;
  return { chars, tokens };
};
