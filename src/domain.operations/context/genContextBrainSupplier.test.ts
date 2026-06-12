import { given, then, when } from 'test-fns';

import { genContextBrainSupplier } from './genContextBrainSupplier';

describe('genContextBrainSupplier', () => {
  given('[case1] keyrack creds', () => {
    when('[t0] supplier with keyrack config', () => {
      const result = genContextBrainSupplier('xai', {
        creds: { keyrack: { owner: 'ehmpathy', env: 'test' } },
      });

      then('key is namespaced with brain.supplier prefix', () => {
        expect(Object.keys(result)).toEqual(['brain.supplier.xai']);
      });

      then('supplies are accessible via key', () => {
        expect(result['brain.supplier.xai']!.creds).toEqual({
          keyrack: { owner: 'ehmpathy', env: 'test' },
        });
      });

      then('output matches snapshot', () => {
        expect(result).toMatchSnapshot();
      });
    });
  });

  given('[case2] getter creds', () => {
    when('[t0] supplier with async getter', () => {
      const getter = async () => ({ XAI_API_KEY: 'test-key' });
      const result = genContextBrainSupplier('xai', {
        creds: getter,
      });

      then('key is namespaced with brain.supplier prefix', () => {
        expect(Object.keys(result)).toEqual(['brain.supplier.xai']);
      });

      then('creds is the getter function', () => {
        expect(typeof result['brain.supplier.xai']!.creds).toEqual('function');
      });

      then('output structure matches snapshot', () => {
        // snapshot structure without function reference
        expect({
          keys: Object.keys(result),
          credsType: typeof result['brain.supplier.xai']!.creds,
        }).toMatchSnapshot();
      });
    });
  });

  given('[case3] null creds', () => {
    when('[t0] supplier with null creds', () => {
      const result = genContextBrainSupplier('fireworks', {
        creds: null,
      });

      then('key is namespaced correctly', () => {
        expect(Object.keys(result)).toEqual(['brain.supplier.fireworks']);
      });

      then('creds is null', () => {
        expect(result['brain.supplier.fireworks']!.creds).toBeNull();
      });

      then('output matches snapshot', () => {
        expect(result).toMatchSnapshot();
      });
    });
  });

  given('[case4] supplier with extra properties', () => {
    when('[t0] supplies include additional config', () => {
      const result = genContextBrainSupplier('openai', {
        creds: { keyrack: { owner: 'ehmpathy', env: 'prod' } },
        model: 'gpt-4',
        temperature: 0.7,
      });

      then('key is namespaced correctly', () => {
        expect(Object.keys(result)).toEqual(['brain.supplier.openai']);
      });

      then('all properties are preserved', () => {
        const supplies = result['brain.supplier.openai']!;
        expect(supplies.creds).toEqual({
          keyrack: { owner: 'ehmpathy', env: 'prod' },
        });
        expect((supplies as Record<string, unknown>).model).toEqual('gpt-4');
        expect((supplies as Record<string, unknown>).temperature).toEqual(0.7);
      });

      then('output matches snapshot', () => {
        expect(result).toMatchSnapshot();
      });
    });
  });

  given('[case5] different supplier slugs', () => {
    when('[t0] fireworks supplier', () => {
      const result = genContextBrainSupplier('fireworks', {
        creds: { keyrack: { owner: 'ehmpathy', env: 'test' } },
      });

      then('key uses correct slug', () => {
        expect(Object.keys(result)).toEqual(['brain.supplier.fireworks']);
      });

      then('output matches snapshot', () => {
        expect(result).toMatchSnapshot();
      });
    });

    when('[t1] openai supplier', () => {
      const result = genContextBrainSupplier('openai', {
        creds: { keyrack: { owner: 'ehmpathy', env: 'prod' } },
      });

      then('key uses correct slug', () => {
        expect(Object.keys(result)).toEqual(['brain.supplier.openai']);
      });

      then('output matches snapshot', () => {
        expect(result).toMatchSnapshot();
      });
    });

    when('[t2] anthropic supplier', () => {
      const result = genContextBrainSupplier('anthropic', {
        creds: { keyrack: { owner: 'ehmpathy', env: 'prep' } },
      });

      then('key uses correct slug', () => {
        expect(Object.keys(result)).toEqual(['brain.supplier.anthropic']);
      });

      then('output matches snapshot', () => {
        expect(result).toMatchSnapshot();
      });
    });
  });
});
