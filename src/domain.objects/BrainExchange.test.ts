import { DomainLiteral } from 'domain-objects';
import { given, then, when } from 'test-fns';

import { BrainExchange } from './BrainExchange';

describe('BrainExchange', () => {
  given('[case1] valid BrainExchange props', () => {
    const props = {
      hash: 'abc123',
      input: 'hello',
      output: 'world',
      exid: 'ex-001',
    };

    when('[t0] BrainExchange is instantiated', () => {
      then('creates instance with all properties', () => {
        const exchange = new BrainExchange(props);
        expect(exchange.hash).toEqual('abc123');
        expect(exchange.input).toEqual('hello');
        expect(exchange.output).toEqual('world');
        expect(exchange.exid).toEqual('ex-001');
      });

      then('extends DomainLiteral', () => {
        const exchange = new BrainExchange(props);
        expect(exchange).toBeInstanceOf(DomainLiteral);
      });
    });
  });

  given('[case2] null exid (supplier did not provide)', () => {
    const props = {
      hash: 'abc123',
      input: 'hello',
      output: 'world',
      exid: null,
    };

    when('[t0] BrainExchange is instantiated', () => {
      then('accepts null exid', () => {
        const exchange = new BrainExchange(props);
        expect(exchange.exid).toBeNull();
      });
    });
  });
});
