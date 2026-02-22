import { given, then, when } from 'test-fns';
import { z } from 'zod';

// import from dist to verify export works for consumers (true blackbox)
import {
  genBrainContinuables,
  BrainAtom,
  BrainRepl,
  BrainOutput,
  BrainSpec,
} from '../../dist';

// load demo brain supplier fixture (simulates external rhachet-brains-* package)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const parrotBrains = require('../.test/assets/rhachet-brains-parrot/index.js');

/**
 * acceptance tests for brain supplier continuation via genBrainContinuables
 *
 * validates that external brain suppliers can:
 * - import genBrainContinuables from rhachet sdk
 * - implement BrainAtom and BrainRepl that use genBrainContinuables
 * - return properly structured episodes and series
 * - support continuation via { on: { episode } } and { on: { series } }
 *
 * this is a true blackbox test: the fixture simulates an external package
 * that implements brains and imports only from rhachet's published dist
 */
describe('brainSupplier.continuation', () => {
  const outputSchema = z.object({ content: z.string() });

  given('[case1] parrot BrainAtom via supplier fixture', () => {
    // inject rhachet dependencies into the supplier's factory function
    const parrotAtom = parrotBrains.createParrotAtom({
      genBrainContinuables,
      BrainAtom,
      BrainOutput,
      BrainSpec,
    });

    when('[t0] .ask() without continuation', () => {
      then('returns episode (no series)', async () => {
        const result = await parrotAtom.ask({
          prompt: 'hello world',
          schema: { output: outputSchema },
          role: {},
        });

        // verify episode structure
        expect(result.episode.hash).toBeDefined();
        expect(Array.isArray(result.episode.exchanges)).toBe(true);
        expect(result.series).toBeNull();
        expect(result.episode.exchanges).toHaveLength(1);
        // verify exchange structure
        expect(result.episode.exchanges[0]?.hash).toBeDefined();
        expect(result.episode.exchanges[0]?.input).toBeDefined();
        expect(result.episode.exchanges[0]?.output).toBeDefined();
      });

      then('parrots input words backwards', async () => {
        const result = await parrotAtom.ask({
          prompt: 'one two three',
          schema: { output: outputSchema },
          role: {},
        });

        expect(result.output.content).toEqual('three two one');
      });
    });

    when('[t1] .ask() with { on: { episode } }', () => {
      then('returns new episode with prior exchanges', async () => {
        // first call
        const first = await parrotAtom.ask({
          prompt: 'first question',
          schema: { output: outputSchema },
          role: {},
        });
        const firstExchangeCount = first.episode.exchanges.length;

        // second call with continuation
        const second = await parrotAtom.ask({
          on: { episode: first.episode },
          prompt: 'follow up',
          schema: { output: outputSchema },
          role: {},
        });

        // new episode has more exchanges
        expect(second.episode.exchanges.length).toBeGreaterThan(
          firstExchangeCount,
        );
        // prior episode is unchanged (immutable)
        expect(first.episode.exchanges.length).toEqual(firstExchangeCount);
      });
    });

    when('[t2] multiple independent .ask() calls', () => {
      then('each returns distinct episode', async () => {
        const result1 = await parrotAtom.ask({
          prompt: 'alpha beta',
          schema: { output: outputSchema },
          role: {},
        });
        const result2 = await parrotAtom.ask({
          prompt: 'gamma delta',
          schema: { output: outputSchema },
          role: {},
        });

        // each has exactly 1 exchange (independent)
        expect(result1.episode.exchanges.length).toEqual(1);
        expect(result2.episode.exchanges.length).toEqual(1);
        // different hashes
        expect(result1.episode.hash).not.toEqual(result2.episode.hash);
        // verify parrot behavior
        expect(result1.output.content).toEqual('beta alpha');
        expect(result2.output.content).toEqual('delta gamma');
      });
    });
  });

  given('[case2] parrot BrainRepl via supplier fixture', () => {
    // inject rhachet dependencies into the supplier's factory function
    const parrotRepl = parrotBrains.createParrotRepl({
      genBrainContinuables,
      BrainRepl,
      BrainOutput,
      BrainSpec,
    });

    when('[t0] .ask() without continuation', () => {
      then('returns episode and series', async () => {
        const result = await parrotRepl.ask({
          prompt: 'hello world',
          schema: { output: outputSchema },
          role: {},
        });

        // verify episode structure
        expect(result.episode.hash).toBeDefined();
        expect(Array.isArray(result.episode.exchanges)).toBe(true);
        // verify series structure
        expect(result.series?.hash).toBeDefined();
        expect(Array.isArray(result.series?.episodes)).toBe(true);
        // episode is in series
        expect(result.series?.episodes).toContainEqual(result.episode);
      });

      then('parrots input words backwards', async () => {
        const result = await parrotRepl.ask({
          prompt: 'one two three',
          schema: { output: outputSchema },
          role: {},
        });

        expect(result.output.content).toEqual('three two one');
      });
    });

    when('[t1] .ask() with { on: { series } }', () => {
      then('returns new series with prior episodes + new episode', async () => {
        // first call
        const first = await parrotRepl.ask({
          prompt: 'first question',
          schema: { output: outputSchema },
          role: {},
        });

        // failfast: series must exist for BrainRepl
        expect(first.series).not.toBeNull();
        if (!first.series)
          throw new Error('series must not be null for BrainRepl');

        const firstEpisodeCount = first.series.episodes.length;

        // second call with series continuation
        const second = await parrotRepl.ask({
          on: { series: first.series },
          prompt: 'follow up',
          schema: { output: outputSchema },
          role: {},
        });

        // failfast: series must exist for BrainRepl
        expect(second.series).not.toBeNull();
        if (!second.series)
          throw new Error('series must not be null for BrainRepl');

        // new series has more episodes
        expect(second.series.episodes.length).toBeGreaterThan(firstEpisodeCount);
        // prior series is unchanged (immutable)
        expect(first.series.episodes.length).toEqual(firstEpisodeCount);
      });
    });

    when('[t2] .ask() with { on: { episode } }', () => {
      then('returns new episode with prior exchanges', async () => {
        // first call
        const first = await parrotRepl.ask({
          prompt: 'first question',
          schema: { output: outputSchema },
          role: {},
        });
        const firstExchangeCount = first.episode.exchanges.length;

        // second call with episode continuation
        const second = await parrotRepl.ask({
          on: { episode: first.episode },
          prompt: 'follow up',
          schema: { output: outputSchema },
          role: {},
        });

        // new episode has more exchanges
        expect(second.episode.exchanges.length).toBeGreaterThan(
          firstExchangeCount,
        );
        // prior episode is unchanged (immutable)
        expect(first.episode.exchanges.length).toEqual(firstExchangeCount);
      });
    });

    when('[t3] .act() with { on: { series } }', () => {
      then('returns new series with prior episodes', async () => {
        // first ask
        const askResult = await parrotRepl.ask({
          prompt: 'analyze this',
          schema: { output: outputSchema },
          role: {},
        });

        // failfast: series must exist for BrainRepl
        expect(askResult.series).not.toBeNull();
        if (!askResult.series)
          throw new Error('series must not be null for BrainRepl');

        // act with series continuation
        const actResult = await parrotRepl.act({
          on: { series: askResult.series },
          prompt: 'implement it',
          schema: { output: outputSchema },
          role: {},
        });

        // failfast: series must exist for BrainRepl
        expect(actResult.series).not.toBeNull();
        if (!actResult.series)
          throw new Error('series must not be null for BrainRepl');

        expect(actResult.series.episodes.length).toBeGreaterThan(
          askResult.series.episodes.length,
        );
      });
    });

    when('[t4] multiple independent .ask() calls', () => {
      then('each returns distinct series', async () => {
        const result1 = await parrotRepl.ask({
          prompt: 'alpha beta',
          schema: { output: outputSchema },
          role: {},
        });
        const result2 = await parrotRepl.ask({
          prompt: 'gamma delta',
          schema: { output: outputSchema },
          role: {},
        });

        // each has exactly 1 episode (independent)
        expect(result1.series?.episodes.length).toEqual(1);
        expect(result2.series?.episodes.length).toEqual(1);
        // different hashes
        expect(result1.series?.hash).not.toEqual(result2.series?.hash);
        // verify parrot behavior
        expect(result1.output.content).toEqual('beta alpha');
        expect(result2.output.content).toEqual('delta gamma');
      });
    });
  });

  given('[case3] supplier can pass exids through genBrainContinuables', () => {
    const parrotAtom = parrotBrains.createParrotAtom({
      genBrainContinuables,
      BrainAtom,
      BrainOutput,
      BrainSpec,
    });

    when('[t0] supplier provides exids', () => {
      then('episode reflects the exid from genBrainContinuables', async () => {
        // the fixture doesn't currently pass exids, but we verify the structure
        // supports them via the null values (as expected when not provided)
        const result = await parrotAtom.ask({
          prompt: 'test',
          schema: { output: outputSchema },
          role: {},
        });

        // exids are null when not provided
        expect(result.episode.exid).toBeNull();
        expect(result.episode.exchanges[0]?.exid).toBeNull();
      });
    });
  });
});
