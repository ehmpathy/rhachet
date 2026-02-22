import { given, then, when } from 'test-fns';

// import from dist to verify export works for consumers
import { calcBrainTokens } from '../../dist';

describe('calcBrainTokens', () => {
  given('[case1] sdk export', () => {
    when('[t0] words provided', () => {
      then('tokenizes via BPE and returns accurate count', () => {
        const result = calcBrainTokens({ of: { words: 'Hello, world!' } });

        // BPE tokenizer should return accurate token count
        expect(result.chars).toEqual(13);
        expect(result.tokens).toBeGreaterThan(0);
        expect(result.tokens).toBeLessThan(result.chars); // tokens < chars for English
      });

      then('handles empty string', () => {
        const result = calcBrainTokens({ of: { words: '' } });

        expect(result.chars).toEqual(0);
        expect(result.tokens).toEqual(0);
      });

      then('handles longer words with known token count', () => {
        // "The quick brown fox jumps over the lazy dog" is a well-known pangram
        const result = calcBrainTokens({
          of: { words: 'The quick brown fox jumps over the lazy dog.' },
        });

        expect(result.chars).toEqual(44);
        // BPE typically produces ~10 tokens for this sentence
        expect(result.tokens).toBeGreaterThanOrEqual(8);
        expect(result.tokens).toBeLessThanOrEqual(12);
      });
    });
  });
});
