import { given, then, when } from 'test-fns';
import { z } from 'zod';

// import from dist to verify export works for consumers
import type { BrainRepl } from '../../dist';

// import test fixtures from shared infra
import { genMockedBrainRepl } from '@src/.test.assets/genMockedBrainRepl';

/**
 * acceptance tests for BrainRepl continuation via episode and series references
 *
 * validates that:
 * - BrainRepl returns episodes and series
 * - continuation via { on: { episode } } appends exchanges
 * - continuation via { on: { series } } appends episodes
 * - domain objects are immutable (prior references unchanged)
 *
 * note: we use duck-type checks instead of instanceof because
 * the class identity differs between dist and source imports
 */
describe('brainRepl.continuation', () => {
  const outputSchema = z.object({ content: z.string() });

  given('[case1] BrainRepl continuation', () => {
    const repl: BrainRepl = genMockedBrainRepl({ content: 'repl response' });

    when('[t0] .ask() without continuation', () => {
      then('returns episode and series', async () => {
        const result = await repl.ask({
          prompt: 'test question',
          schema: { output: outputSchema },
          role: {},
        });

        // duck-type check: episode has hash and exchanges
        expect(result.episode.hash).toBeDefined();
        expect(Array.isArray(result.episode.exchanges)).toBe(true);
        // duck-type check: series has hash and episodes
        expect(result.series?.hash).toBeDefined();
        expect(Array.isArray(result.series?.episodes)).toBe(true);
        // episode is in series
        expect(result.series?.episodes).toContainEqual(result.episode);
      });
    });

    when('[t1] .ask() with { on: { series } }', () => {
      then('returns new series with prior episodes + new episode', async () => {
        // first call
        const first = await repl.ask({
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
        const second = await repl.ask({
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
        const first = await repl.ask({
          prompt: 'first question',
          schema: { output: outputSchema },
          role: {},
        });
        const firstExchangeCount = first.episode.exchanges.length;

        // second call with episode continuation
        const second = await repl.ask({
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
        const askResult = await repl.ask({
          prompt: 'analyze this',
          schema: { output: outputSchema },
          role: {},
        });

        // failfast: series must exist for BrainRepl
        expect(askResult.series).not.toBeNull();
        if (!askResult.series)
          throw new Error('series must not be null for BrainRepl');

        // act with series continuation
        const actResult = await repl.act({
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
        const result1 = await repl.ask({
          prompt: 'question 1',
          schema: { output: outputSchema },
          role: {},
        });
        const result2 = await repl.ask({
          prompt: 'question 2',
          schema: { output: outputSchema },
          role: {},
        });

        // each has exactly 1 episode (independent)
        expect(result1.series?.episodes.length).toEqual(1);
        expect(result2.series?.episodes.length).toEqual(1);
        // different hashes
        expect(result1.series?.hash).not.toEqual(result2.series?.hash);
      });
    });
  });

  given('[case2] BrainRepl domain object shapes', () => {
    const repl: BrainRepl = genMockedBrainRepl({ content: 'test' });

    when('[t0] BrainSeries shape', () => {
      then('has expected properties', async () => {
        const result = await repl.ask({
          prompt: 'test',
          schema: { output: outputSchema },
          role: {},
        });

        expect(result.series?.hash).toBeDefined();
        expect(typeof result.series?.hash).toEqual('string');
        expect(result.series?.exid).toBeNull(); // mocked brain has no supplier id
        expect(Array.isArray(result.series?.episodes)).toBe(true);
      });
    });
  });
});
