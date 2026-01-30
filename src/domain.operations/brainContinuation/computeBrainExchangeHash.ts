import { asHashSha256 } from 'hash-fns';

/**
 * .what = computes content-derived hash for a BrainExchange
 * .why = enables deterministic identity based on content, not supplier id
 *
 * .note = excludes exid — hash is content-addressed, not supplier-addressed
 * .note = async for cross-platform portability
 */
export const computeBrainExchangeHash = async (input: {
  input: string;
  output: string;
}): Promise<string> => {
  const content = [input.input, input.output].join('\n');
  return asHashSha256(content);
};
