/**
 * demo brain supplier: rhachet-brains-parrot
 *
 * .what = provides BrainAtom and BrainRepl that parrot input words backwards
 * .why = demonstrates how brain suppliers can use genBrainContinuables
 *
 * this fixture proves for acceptance tests:
 * - brain suppliers can import from rhachet
 * - brain suppliers can use genBrainContinuables for continuation
 * - the full end-to-end lifecycle works
 */

/**
 * .what = reverses the words in a string
 * .why = the "parrot" behavior for demo purposes
 */
const reverseWords = (input) => {
  return input.split(' ').reverse().join(' ');
};

/**
 * .what = creates a parrot BrainAtom
 * .why = demonstrates BrainAtom implementation with genBrainContinuables
 *
 * @param {object} deps - injected dependencies from rhachet
 * @param {Function} deps.genBrainContinuables - continuation generator
 * @param {Function} deps.BrainAtom - BrainAtom class
 * @param {Function} deps.BrainOutput - BrainOutput class
 * @param {Function} deps.BrainSpec - BrainSpec class
 */
const createParrotAtom = ({ genBrainContinuables, BrainAtom, BrainOutput, BrainSpec }) => {
  const spec = new BrainSpec({
    cost: {
      per: {
        input: { tokens: 1000, cash: { usd: 0.001 } },
        output: { tokens: 1000, cash: { usd: 0.002 } },
        cache: {
          get: { tokens: 1000, cash: { usd: 0.0001 } },
          set: { tokens: 1000, cash: { usd: 0.0005 } },
        },
      },
      overhead: { cash: { usd: 0 }, time: { ms: 10 } },
    },
    limits: {
      context: { tokens: 100000 },
      rate: { requests: { per: { minute: 60 } } },
    },
  });

  return new BrainAtom({
    repo: 'parrot',
    slug: 'parrot-atom',
    description: 'demo atom that parrots input words backwards',
    spec,
    ask: async (input) => {
      // parse the output schema to get the expected shape
      const output = input.schema.output.parse({
        content: reverseWords(input.prompt),
      });

      // use genBrainContinuables to manage episode state
      const { episode } = await genBrainContinuables({
        for: { grain: 'atom' },
        on: { episode: input.on?.episode ?? null },
        with: {
          exchange: {
            input: input.prompt,
            output: JSON.stringify(output),
            exid: null,
          },
        },
      });

      return new BrainOutput({
        output,
        metrics: {
          size: {
            tokens: { input: input.prompt.length, output: JSON.stringify(output).length, cache: { get: 0, set: 0 } },
            chars: { input: input.prompt.length, output: JSON.stringify(output).length, cache: { get: 0, set: 0 } },
          },
          cost: {
            time: { milliseconds: 1 },
            cash: {
              total: { iso: '$0.00 USD' },
              deets: {
                input: { iso: '$0.00 USD' },
                output: { iso: '$0.00 USD' },
                cache: { get: { iso: '$0.00 USD' }, set: { iso: '$0.00 USD' } },
              },
            },
          },
        },
        episode,
        series: null,
      });
    },
  });
};

/**
 * .what = creates a parrot BrainRepl
 * .why = demonstrates BrainRepl implementation with genBrainContinuables
 *
 * @param {object} deps - injected dependencies from rhachet
 * @param {Function} deps.genBrainContinuables - continuation generator
 * @param {Function} deps.BrainRepl - BrainRepl class
 * @param {Function} deps.BrainOutput - BrainOutput class
 * @param {Function} deps.BrainSpec - BrainSpec class
 */
const createParrotRepl = ({ genBrainContinuables, BrainRepl, BrainOutput, BrainSpec }) => {
  const spec = new BrainSpec({
    cost: {
      per: {
        input: { tokens: 1000, cash: { usd: 0.001 } },
        output: { tokens: 1000, cash: { usd: 0.002 } },
        cache: {
          get: { tokens: 1000, cash: { usd: 0.0001 } },
          set: { tokens: 1000, cash: { usd: 0.0005 } },
        },
      },
      overhead: { cash: { usd: 0 }, time: { ms: 10 } },
    },
    limits: {
      context: { tokens: 100000 },
      rate: { requests: { per: { minute: 60 } } },
    },
  });

  return new BrainRepl({
    repo: 'parrot',
    slug: 'parrot-repl',
    description: 'demo repl that parrots input words backwards',
    spec,
    ask: async (input) => {
      const output = input.schema.output.parse({
        content: reverseWords(input.prompt),
      });

      // use genBrainContinuables to manage episode and series state
      const { episode, series } = await genBrainContinuables({
        for: { grain: 'repl' },
        on: {
          episode: input.on?.episode ?? null,
          series: input.on?.series ?? null,
        },
        with: {
          exchange: {
            input: input.prompt,
            output: JSON.stringify(output),
            exid: null,
          },
        },
      });

      return new BrainOutput({
        output,
        metrics: {
          size: {
            tokens: { input: input.prompt.length, output: JSON.stringify(output).length, cache: { get: 0, set: 0 } },
            chars: { input: input.prompt.length, output: JSON.stringify(output).length, cache: { get: 0, set: 0 } },
          },
          cost: {
            time: { milliseconds: 1 },
            cash: {
              total: { iso: '$0.00 USD' },
              deets: {
                input: { iso: '$0.00 USD' },
                output: { iso: '$0.00 USD' },
                cache: { get: { iso: '$0.00 USD' }, set: { iso: '$0.00 USD' } },
              },
            },
          },
        },
        episode,
        series,
      });
    },
    act: async (input) => {
      const output = input.schema.output.parse({
        content: reverseWords(input.prompt),
      });

      const { episode, series } = await genBrainContinuables({
        for: { grain: 'repl' },
        on: {
          episode: input.on?.episode ?? null,
          series: input.on?.series ?? null,
        },
        with: {
          exchange: {
            input: input.prompt,
            output: JSON.stringify(output),
            exid: null,
          },
        },
      });

      return new BrainOutput({
        output,
        metrics: {
          size: {
            tokens: { input: input.prompt.length, output: JSON.stringify(output).length, cache: { get: 0, set: 0 } },
            chars: { input: input.prompt.length, output: JSON.stringify(output).length, cache: { get: 0, set: 0 } },
          },
          cost: {
            time: { milliseconds: 1 },
            cash: {
              total: { iso: '$0.00 USD' },
              deets: {
                input: { iso: '$0.00 USD' },
                output: { iso: '$0.00 USD' },
                cache: { get: { iso: '$0.00 USD' }, set: { iso: '$0.00 USD' } },
              },
            },
          },
        },
        episode,
        series,
      });
    },
  });
};

module.exports = {
  createParrotAtom,
  createParrotRepl,
  reverseWords,
};
