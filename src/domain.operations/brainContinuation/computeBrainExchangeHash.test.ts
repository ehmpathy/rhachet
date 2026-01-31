import { given, then, when } from 'test-fns';

import { computeBrainExchangeHash } from './computeBrainExchangeHash';

describe('computeBrainExchangeHash', () => {
  given('[case1] valid input and output', () => {
    const inputVal = 'hello';
    const outputVal = 'world';

    when('[t0] hash is computed', () => {
      then('returns expected content-derived hash', async () => {
        const hash = await computeBrainExchangeHash({
          input: inputVal,
          output: outputVal,
        });
        expect(hash).toEqual(
          '26c60a61d01db5836ca70fefd44a6a016620413c8ef5f259a6c5612d4f79d3b8',
        );
      });

      then('hash is deterministic', async () => {
        const hash1 = await computeBrainExchangeHash({
          input: inputVal,
          output: outputVal,
        });
        const hash2 = await computeBrainExchangeHash({
          input: inputVal,
          output: outputVal,
        });
        expect(hash1).toEqual(hash2);
      });
    });
  });

  given('[case2] different content', () => {
    when('[t0] input differs', () => {
      then('hash differs', async () => {
        const hash1 = await computeBrainExchangeHash({
          input: 'hello',
          output: 'world',
        });
        const hash2 = await computeBrainExchangeHash({
          input: 'hi',
          output: 'world',
        });
        expect(hash1).not.toEqual(hash2);
      });
    });

    when('[t1] output differs', () => {
      then('hash differs', async () => {
        const hash1 = await computeBrainExchangeHash({
          input: 'hello',
          output: 'world',
        });
        const hash2 = await computeBrainExchangeHash({
          input: 'hello',
          output: 'earth',
        });
        expect(hash1).not.toEqual(hash2);
      });
    });
  });

  given('[case3] empty strings', () => {
    when('[t0] input and output are empty', () => {
      then('returns expected content-derived hash', async () => {
        const hash = await computeBrainExchangeHash({
          input: '',
          output: '',
        });
        expect(hash).toEqual(
          '01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca546b',
        );
      });
    });
  });
});
