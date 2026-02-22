import { given, then, when } from 'test-fns';
import { z } from 'zod';

// import from dist to verify export works for consumers
import type { BrainAtom } from '../../dist';

// import test fixtures from shared infra
import { genMockedBrainAtom } from '@src/.test.assets/genMockedBrainAtom';

/**
 * acceptance tests for BrainAtom continuation via episode references
 *
 * validates that:
 * - BrainAtom returns episodes (no series)
 * - continuation via { on: { episode } } appends exchanges
 * - domain objects are immutable (prior references unchanged)
 *
 * note: we use duck-type checks instead of instanceof because
 * the class identity differs between dist and source imports
 */
describe('brainAtom.continuation', () => {
  const outputSchema = z.object({ content: z.string() });

  given('[case1] BrainAtom continuation', () => {
    const atom: BrainAtom = genMockedBrainAtom({ content: 'atom response' });

    when('[t0] .ask() without continuation', () => {
      then('returns episode (no series)', async () => {
        const result = await atom.ask({
          prompt: 'test question',
          schema: { output: outputSchema },
          role: {},
        });

        // duck-type check: episode has hash and exchanges
        expect(result.episode.hash).toBeDefined();
        expect(Array.isArray(result.episode.exchanges)).toBe(true);
        expect(result.series).toBeNull();
        expect(result.episode.exchanges).toHaveLength(1);
        // duck-type check: exchange has hash, input, output
        expect(result.episode.exchanges[0]?.hash).toBeDefined();
        expect(result.episode.exchanges[0]?.input).toBeDefined();
        expect(result.episode.exchanges[0]?.output).toBeDefined();
      });
    });

    when('[t1] .ask() with { on: { episode } }', () => {
      then('returns new episode with prior exchanges', async () => {
        // first call
        const first = await atom.ask({
          prompt: 'first question',
          schema: { output: outputSchema },
          role: {},
        });
        const firstExchangeCount = first.episode.exchanges.length;

        // second call with continuation
        const second = await atom.ask({
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
        const result1 = await atom.ask({
          prompt: 'question 1',
          schema: { output: outputSchema },
          role: {},
        });
        const result2 = await atom.ask({
          prompt: 'question 2',
          schema: { output: outputSchema },
          role: {},
        });

        // each has exactly 1 exchange (independent)
        expect(result1.episode.exchanges.length).toEqual(1);
        expect(result2.episode.exchanges.length).toEqual(1);
        // different hashes
        expect(result1.episode.hash).not.toEqual(result2.episode.hash);
      });
    });
  });

  given('[case2] BrainAtom domain object shapes', () => {
    const atom: BrainAtom = genMockedBrainAtom({ content: 'test' });

    when('[t0] BrainEpisode shape', () => {
      then('has expected properties', async () => {
        const result = await atom.ask({
          prompt: 'test',
          schema: { output: outputSchema },
          role: {},
        });

        expect(result.episode.hash).toBeDefined();
        expect(typeof result.episode.hash).toEqual('string');
        expect(result.episode.exid).toBeNull(); // mocked brain has no supplier id
        expect(Array.isArray(result.episode.exchanges)).toBe(true);
      });
    });

    when('[t1] BrainExchange shape', () => {
      then('has expected properties', async () => {
        const result = await atom.ask({
          prompt: 'test prompt',
          schema: { output: outputSchema },
          role: {},
        });

        const exchange = result.episode.exchanges[0];
        // duck-type check: exchange has hash, input, output, exid
        expect(exchange?.hash).toBeDefined();
        expect(typeof exchange?.hash).toEqual('string');
        expect(exchange?.input).toBeDefined();
        expect(exchange?.output).toBeDefined();
        expect(exchange?.exid).toBeNull(); // mocked brain has no supplier id
      });
    });
  });
});
