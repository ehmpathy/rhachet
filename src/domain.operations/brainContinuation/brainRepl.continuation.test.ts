import { given, then, when } from 'test-fns';
import { z } from 'zod';

import { genMockedBrainRepl } from '@src/.test.assets/genMockedBrainRepl';
import { BrainEpisode } from '@src/domain.objects/BrainEpisode';
import { BrainExchange } from '@src/domain.objects/BrainExchange';
import { BrainSeries } from '@src/domain.objects/BrainSeries';

/**
 * acceptance tests for BrainRepl continuation via episode and series references
 *
 * validates usecases 2, 4, 5, 6, 10, 11 from criteria.blackbox.md
 */
describe('BrainRepl.continuation', () => {
  const outputSchema = z.object({ content: z.string() });

  given('[case1] a BrainRepl instance', () => {
    const repl = genMockedBrainRepl({ content: 'test answer' });

    when('[t0] .ask() is called without continuation reference', () => {
      then('a new series is created', async () => {
        const result = await repl.ask({
          prompt: 'what is 2 + 2?',
          schema: { output: outputSchema },
          role: {},
        });
        expect(result.series).toBeInstanceOf(BrainSeries);
      });

      then('a new episode is created within the series', async () => {
        const result = await repl.ask({
          prompt: 'what is 2 + 2?',
          schema: { output: outputSchema },
          role: {},
        });
        expect(result.episode).toBeInstanceOf(BrainEpisode);
        expect(result.series?.episodes).toContainEqual(result.episode);
      });

      then('response includes series reference', async () => {
        const result = await repl.ask({
          prompt: 'what is 2 + 2?',
          schema: { output: outputSchema },
          role: {},
        });
        expect(result.series).toBeDefined();
        expect(result.series?.hash).toBeDefined();
      });

      then('response includes episode reference', async () => {
        const result = await repl.ask({
          prompt: 'what is 2 + 2?',
          schema: { output: outputSchema },
          role: {},
        });
        expect(result.episode).toBeDefined();
        expect(result.episode.hash).toBeDefined();
      });

      then('response includes the brain output', async () => {
        const result = await repl.ask({
          prompt: 'what is 2 + 2?',
          schema: { output: outputSchema },
          role: {},
        });
        expect(result.output).toEqual({ content: 'test answer' });
      });
    });
  });

  given('[case2] a series reference from a prior BrainRepl .ask() call', () => {
    const repl = genMockedBrainRepl({ content: 'continued answer' });

    when('[t0] .ask() is called with { on: { series } }', () => {
      then('response includes a NEW series reference', async () => {
        // first call to get series
        const firstResult = await repl.ask({
          prompt: 'first question',
          schema: { output: outputSchema },
          role: {},
        });
        const firstSeries = firstResult.series;
        expect(firstSeries).not.toBeNull(); // guard: repl always returns series
        if (!firstSeries) return;

        // second call with series continuation
        const secondResult = await repl.ask({
          on: { series: firstSeries },
          prompt: 'follow up question',
          schema: { output: outputSchema },
          role: {},
        });
        const secondSeries = secondResult.series;
        expect(secondSeries).not.toBeNull();
        if (!secondSeries) return;

        // new series should have more episodes
        expect(secondSeries.episodes.length).toBeGreaterThan(
          firstSeries.episodes.length,
        );
      });

      then(
        'the prior series reference remains valid and unchanged',
        async () => {
          const firstResult = await repl.ask({
            prompt: 'first question',
            schema: { output: outputSchema },
            role: {},
          });
          const firstSeries = firstResult.series;
          expect(firstSeries).not.toBeNull();
          if (!firstSeries) return;

          const firstEpisodeCount = firstSeries.episodes.length;

          // second call with series continuation
          await repl.ask({
            on: { series: firstSeries },
            prompt: 'follow up question',
            schema: { output: outputSchema },
            role: {},
          });

          // first series should be unchanged (immutable)
          expect(firstSeries.episodes.length).toEqual(firstEpisodeCount);
        },
      );

      then('response includes a NEW episode reference', async () => {
        const firstResult = await repl.ask({
          prompt: 'first question',
          schema: { output: outputSchema },
          role: {},
        });
        expect(firstResult.series).not.toBeNull();
        if (!firstResult.series) return;

        const secondResult = await repl.ask({
          on: { series: firstResult.series },
          prompt: 'follow up question',
          schema: { output: outputSchema },
          role: {},
        });

        expect(secondResult.episode.hash).not.toEqual(firstResult.episode.hash);
      });

      then('response includes the brain output', async () => {
        const firstResult = await repl.ask({
          prompt: 'first question',
          schema: { output: outputSchema },
          role: {},
        });
        expect(firstResult.series).not.toBeNull();
        if (!firstResult.series) return;

        const secondResult = await repl.ask({
          on: { series: firstResult.series },
          prompt: 'follow up question',
          schema: { output: outputSchema },
          role: {},
        });

        expect(secondResult.output).toEqual({ content: 'continued answer' });
      });
    });
  });

  given(
    '[case3] an episode reference from a prior BrainRepl .ask() call',
    () => {
      const repl = genMockedBrainRepl({ content: 'episode continued' });

      when('[t0] .ask() is called with { on: { episode } }', () => {
        then(
          'response includes a NEW episode reference with prior exchanges',
          async () => {
            // first call to get episode
            const firstResult = await repl.ask({
              prompt: 'first question',
              schema: { output: outputSchema },
              role: {},
            });
            const firstEpisode = firstResult.episode;

            // second call with episode continuation
            const secondResult = await repl.ask({
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
            const firstResult = await repl.ask({
              prompt: 'first question',
              schema: { output: outputSchema },
              role: {},
            });
            const firstEpisode = firstResult.episode;
            const firstExchangeCount = firstEpisode.exchanges.length;

            // second call with episode continuation
            await repl.ask({
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
          const firstResult = await repl.ask({
            prompt: 'first question',
            schema: { output: outputSchema },
            role: {},
          });

          const secondResult = await repl.ask({
            on: { episode: firstResult.episode },
            prompt: 'follow up question',
            schema: { output: outputSchema },
            role: {},
          });

          expect(secondResult.output).toEqual({ content: 'episode continued' });
        });
      });
    },
  );

  given('[case4] .act() continues prior context', () => {
    const repl = genMockedBrainRepl({ content: 'action result' });

    when('[t0] .act() is called with { on: { series } }', () => {
      then('response includes a NEW series reference', async () => {
        const askResult = await repl.ask({
          prompt: 'analyze this',
          schema: { output: outputSchema },
          role: {},
        });
        expect(askResult.series).not.toBeNull();
        if (!askResult.series) return;

        const actResult = await repl.act({
          on: { series: askResult.series },
          prompt: 'now implement it',
          schema: { output: outputSchema },
          role: {},
        });
        expect(actResult.series).not.toBeNull();
        if (!actResult.series) return;

        expect(actResult.series.episodes.length).toBeGreaterThan(
          askResult.series.episodes.length,
        );
      });

      then('response includes a NEW episode reference', async () => {
        const askResult = await repl.ask({
          prompt: 'analyze this',
          schema: { output: outputSchema },
          role: {},
        });
        expect(askResult.series).not.toBeNull();
        if (!askResult.series) return;

        const actResult = await repl.act({
          on: { series: askResult.series },
          prompt: 'now implement it',
          schema: { output: outputSchema },
          role: {},
        });

        expect(actResult.episode.hash).not.toEqual(askResult.episode.hash);
      });
    });

    when('[t1] .act() is called with { on: { episode } }', () => {
      then('response includes a NEW episode reference', async () => {
        const askResult = await repl.ask({
          prompt: 'analyze this',
          schema: { output: outputSchema },
          role: {},
        });

        const actResult = await repl.act({
          on: { episode: askResult.episode },
          prompt: 'now implement it',
          schema: { output: outputSchema },
          role: {},
        });

        expect(actResult.episode.exchanges.length).toBeGreaterThan(
          askResult.episode.exchanges.length,
        );
      });

      then('response includes the brain output', async () => {
        const askResult = await repl.ask({
          prompt: 'analyze this',
          schema: { output: outputSchema },
          role: {},
        });

        const actResult = await repl.act({
          on: { episode: askResult.episode },
          prompt: 'now implement it',
          schema: { output: outputSchema },
          role: {},
        });

        expect(actResult.output).toEqual({ content: 'action result' });
      });
    });
  });

  given('[case5] series reference shape', () => {
    const repl = genMockedBrainRepl({ content: 'test' });

    when('[t0] user inspects the series reference', () => {
      then('series is a BrainSeries (DomainLiteral)', async () => {
        const result = await repl.ask({
          prompt: 'test',
          schema: { output: outputSchema },
          role: {},
        });
        expect(result.series).toBeInstanceOf(BrainSeries);
      });

      then('series has episodes array', async () => {
        const result = await repl.ask({
          prompt: 'test',
          schema: { output: outputSchema },
          role: {},
        });
        expect(Array.isArray(result.series?.episodes)).toBe(true);
        expect(result.series?.episodes.length).toBeGreaterThan(0);
      });

      then('episodes contain exchanges', async () => {
        const result = await repl.ask({
          prompt: 'test prompt',
          schema: { output: outputSchema },
          role: {},
        });
        const episode = result.series?.episodes[0];
        expect(episode).toBeInstanceOf(BrainEpisode);
        const exchange = episode?.exchanges[0];
        expect(exchange).toBeInstanceOf(BrainExchange);
        expect(exchange?.input).toBeDefined();
        expect(exchange?.output).toBeDefined();
      });
    });
  });

  given('[case6] independent series on same operation', () => {
    const repl = genMockedBrainRepl({ content: 'independent' });

    when('[t0] user makes .ask() calls without continuation', () => {
      then('each call creates an independent series', async () => {
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

        // each should have exactly 1 episode (independent)
        expect(result1.series?.episodes.length).toEqual(1);
        expect(result2.series?.episodes.length).toEqual(1);
      });

      then('each response has a distinct series reference', async () => {
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

        // different hashes because different content
        expect(result1.series?.hash).not.toEqual(result2.series?.hash);
      });
    });
  });

  given('[case7] structured output via schema', () => {
    const typedRepl = genMockedBrainRepl({ content: 'structured response' });

    when('[t0] .ask() is called with { schema: { output: z.Schema } }', () => {
      then('response.output conforms to the schema', async () => {
        const result = await typedRepl.ask({
          prompt: 'rate this',
          schema: { output: outputSchema },
          role: {},
        });

        expect(result.output).toHaveProperty('content');
        expect(result.output.content).toEqual('structured response');
      });

      then('response includes series and episode references', async () => {
        const result = await typedRepl.ask({
          prompt: 'rate this',
          schema: { output: outputSchema },
          role: {},
        });
        expect(result.series).toBeInstanceOf(BrainSeries);
        expect(result.episode).toBeInstanceOf(BrainEpisode);
      });
    });
  });
});
