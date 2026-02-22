import { given, then, when } from 'test-fns';

import { BrainExchange } from '@src/domain.objects/BrainExchange';

import { genBrainExchange } from './genBrainExchange';

describe('genBrainExchange', () => {
  given('[case1] valid input', () => {
    when('[t0] genBrainExchange is called', () => {
      then('returns a BrainExchange instance', async () => {
        const exchange = await genBrainExchange({
          with: { input: 'hello', output: 'world', exid: null },
        });
        expect(exchange).toBeInstanceOf(BrainExchange);
      });

      then('has expected content-derived hash', async () => {
        const exchange = await genBrainExchange({
          with: { input: 'hello', output: 'world', exid: null },
        });
        expect(exchange.hash).toEqual(
          '26c60a61d01db5836ca70fefd44a6a016620413c8ef5f259a6c5612d4f79d3b8',
        );
      });

      then('has correct properties', async () => {
        const exchange = await genBrainExchange({
          with: { input: 'hello', output: 'world', exid: 'ex-123' },
        });
        expect(exchange.input).toEqual('hello');
        expect(exchange.output).toEqual('world');
        expect(exchange.exid).toEqual('ex-123');
      });
    });
  });

  given('[case2] hash determinism', () => {
    when('[t0] same content is used', () => {
      then('hash is identical', async () => {
        const ex1 = await genBrainExchange({
          with: { input: 'hello', output: 'world', exid: null },
        });
        const ex2 = await genBrainExchange({
          with: { input: 'hello', output: 'world', exid: null },
        });
        expect(ex1.hash).toEqual(ex2.hash);
      });
    });

    when('[t1] exid differs but content is same', () => {
      then('hash is identical (exid excluded)', async () => {
        const ex1 = await genBrainExchange({
          with: { input: 'hello', output: 'world', exid: null },
        });
        const ex2 = await genBrainExchange({
          with: { input: 'hello', output: 'world', exid: 'ex-123' },
        });
        expect(ex1.hash).toEqual(ex2.hash);
      });
    });
  });

  given('[case3] content differs', () => {
    when('[t0] input differs', () => {
      then('hash differs', async () => {
        const ex1 = await genBrainExchange({
          with: { input: 'hello', output: 'world', exid: null },
        });
        const ex2 = await genBrainExchange({
          with: { input: 'hi', output: 'world', exid: null },
        });
        expect(ex1.hash).not.toEqual(ex2.hash);
      });
    });
  });
});
