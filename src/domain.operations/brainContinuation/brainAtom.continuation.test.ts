import { given, then, when } from 'test-fns';
import { z } from 'zod';

import { genMockedBrainAtom } from '@src/.test.assets/genMockedBrainAtom';
import { BrainEpisode } from '@src/domain.objects/BrainEpisode';
import { BrainExchange } from '@src/domain.objects/BrainExchange';

/**
 * acceptance tests for BrainAtom continuation via episode references
 *
 * validates usecases 1, 3, 7, 8, 9 from criteria.blackbox.md
 */
describe('BrainAtom.continuation', () => {
  const outputSchema = z.object({ content: z.string() });

  given('[case1] a BrainAtom instance', () => {
    const atom = genMockedBrainAtom({ content: 'test answer' });

    when('[t0] .ask() is called without continuation reference', () => {
      then('a new episode is created', async () => {
        const result = await atom.ask({
          prompt: 'what is 2 + 2?',
          schema: { output: outputSchema },
          role: {},
        });
        expect(result.episode).toBeInstanceOf(BrainEpisode);
      });

      then('response includes episode reference', async () => {
        const result = await atom.ask({
          prompt: 'what is 2 + 2?',
          schema: { output: outputSchema },
          role: {},
        });
        expect(result.episode).toBeDefined();
        expect(result.episode.hash).toBeDefined();
      });

      then('response includes the brain output', async () => {
        const result = await atom.ask({
          prompt: 'what is 2 + 2?',
          schema: { output: outputSchema },
          role: {},
        });
        expect(result.output).toEqual({ content: 'test answer' });
      });

      then('series is null for BrainAtom', async () => {
        const result = await atom.ask({
          prompt: 'what is 2 + 2?',
          schema: { output: outputSchema },
          role: {},
        });
        expect(result.series).toBeNull();
      });
    });
  });

  given(
    '[case2] an episode reference from a prior BrainAtom .ask() call',
    () => {
      const atom = genMockedBrainAtom({ content: 'continued answer' });

      when('[t0] .ask() is called with { on: { episode } }', () => {
        then(
          'response includes a NEW episode reference with prior exchanges',
          async () => {
            // first call to get episode
            const firstResult = await atom.ask({
              prompt: 'first question',
              schema: { output: outputSchema },
              role: {},
            });
            const firstEpisode = firstResult.episode;

            // second call with episode continuation
            const secondResult = await atom.ask({
              on: { episode: firstEpisode },
              prompt: 'follow up question',
              schema: { output: outputSchema },
              role: {},
            });

            // new episode should have more exchanges
            expect(secondResult.episode.exchanges.length).toBeGreaterThan(
              firstEpisode.exchanges.length,
            );
          },
        );

        then(
          'the prior episode reference remains valid and unchanged',
          async () => {
            const firstResult = await atom.ask({
              prompt: 'first question',
              schema: { output: outputSchema },
              role: {},
            });
            const firstEpisode = firstResult.episode;
            const firstExchangeCount = firstEpisode.exchanges.length;

            // second call with episode continuation
            await atom.ask({
              on: { episode: firstEpisode },
              prompt: 'follow up question',
              schema: { output: outputSchema },
              role: {},
            });

            // first episode should be unchanged (immutable)
            expect(firstEpisode.exchanges.length).toEqual(firstExchangeCount);
          },
        );

        then('response includes the brain output', async () => {
          const firstResult = await atom.ask({
            prompt: 'first question',
            schema: { output: outputSchema },
            role: {},
          });

          const secondResult = await atom.ask({
            on: { episode: firstResult.episode },
            prompt: 'follow up question',
            schema: { output: outputSchema },
            role: {},
          });

          expect(secondResult.output).toEqual({ content: 'continued answer' });
        });
      });
    },
  );

  given('[case3] episode reference shape', () => {
    const atom = genMockedBrainAtom({ content: 'test' });

    when('[t0] user inspects the episode reference', () => {
      then('episode is a BrainEpisode (DomainLiteral)', async () => {
        const result = await atom.ask({
          prompt: 'test',
          schema: { output: outputSchema },
          role: {},
        });
        expect(result.episode).toBeInstanceOf(BrainEpisode);
      });

      then('episode has exchanges array', async () => {
        const result = await atom.ask({
          prompt: 'test',
          schema: { output: outputSchema },
          role: {},
        });
        expect(Array.isArray(result.episode.exchanges)).toBe(true);
        expect(result.episode.exchanges.length).toBeGreaterThan(0);
      });

      then('exchanges contain input and output', async () => {
        const result = await atom.ask({
          prompt: 'test prompt',
          schema: { output: outputSchema },
          role: {},
        });
        const exchange = result.episode.exchanges[0];
        expect(exchange).toBeInstanceOf(BrainExchange);
        expect(exchange?.input).toBeDefined();
        expect(exchange?.output).toBeDefined();
      });
    });
  });

  given('[case4] independent episodes on same operation', () => {
    const atom = genMockedBrainAtom({ content: 'independent' });

    when('[t0] user makes .ask() calls without continuation', () => {
      then('each call creates an independent episode', async () => {
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

        // each should have exactly 1 exchange (independent)
        expect(result1.episode.exchanges.length).toEqual(1);
        expect(result2.episode.exchanges.length).toEqual(1);
      });

      then('each response has a distinct episode reference', async () => {
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

        // different hashes because different content
        expect(result1.episode.hash).not.toEqual(result2.episode.hash);
      });
    });
  });

  given('[case5] structured output via schema', () => {
    const typedAtom = genMockedBrainAtom({ content: 'structured response' });

    when('[t0] .ask() is called with { schema: { output: z.Schema } }', () => {
      then('response.output conforms to the schema', async () => {
        const result = await typedAtom.ask({
          prompt: 'rate this',
          schema: { output: outputSchema },
          role: {},
        });

        // genMockedBrainAtom uses schema.parse so output matches schema
        expect(result.output).toHaveProperty('content');
        expect(result.output.content).toEqual('structured response');
      });

      then('response includes episode reference', async () => {
        const result = await typedAtom.ask({
          prompt: 'rate this',
          schema: { output: outputSchema },
          role: {},
        });
        expect(result.episode).toBeInstanceOf(BrainEpisode);
      });
    });
  });
});
