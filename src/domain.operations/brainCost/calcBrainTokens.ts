import { encodingForModel } from 'js-tiktoken';

/**
 * .what = calculates token count for words via BPE tokenizer
 * .why = enables cost estimation for budgets and plans
 *
 * .note = uses js-tiktoken with o200k_base encoder (gpt-4o compatible)
 *   - provides reasonable estimates for cost plans
 *   - not exact; leverage response metrics for exact
 */
export const calcBrainTokens = (input: {
  of: { words: string };
}): { chars: number; tokens: number } => {
  const chars = input.of.words.length;
  const enc = encodingForModel('gpt-4o');
  const tokens = enc.encode(input.of.words).length;
  return { chars, tokens };
};
