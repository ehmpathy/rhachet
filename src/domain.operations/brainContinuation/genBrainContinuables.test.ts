import { given, then, when } from 'test-fns';

import { BrainEpisode } from '@src/domain.objects/BrainEpisode';
import { BrainSeries } from '@src/domain.objects/BrainSeries';

import { genBrainContinuables } from './genBrainContinuables';
import { genBrainEpisode } from './genBrainEpisode';
import { genBrainExchange } from './genBrainExchange';
import { genBrainSeries } from './genBrainSeries';

describe('genBrainContinuables', () => {
  given('[case1] grain is atom', () => {
    when('[t0] called without prior context', () => {
      then('returns episode and null series', async () => {
        const result = await genBrainContinuables({
          for: { grain: 'atom' },
          on: {},
          with: { exchange: { input: 'q1', output: 'a1', exid: null } },
        });

        expect(result.episode).toBeInstanceOf(BrainEpisode);
        expect(result.series).toBeNull();
      });
    });

    when('[t1] called with prior episode', () => {
      then('returns new episode with prior exchanges', async () => {
        const exchange1 = await genBrainExchange({
          with: { input: 'q1', output: 'a1', exid: null },
        });
        const priorEpisode = await genBrainEpisode({
          on: { episode: null },
          with: { exchange: exchange1, exid: null },
        });

        const result = await genBrainContinuables({
          for: { grain: 'atom' },
          on: { episode: priorEpisode },
          with: { exchange: { input: 'q2', output: 'a2', exid: null } },
        });

        expect(result.episode.exchanges.length).toEqual(2);
        expect(result.series).toBeNull();
      });
    });
  });

  given('[case2] grain is repl', () => {
    when('[t0] called without prior context', () => {
      then('returns episode and series', async () => {
        const result = await genBrainContinuables({
          for: { grain: 'repl' },
          on: {},
          with: { exchange: { input: 'q1', output: 'a1', exid: null } },
        });

        expect(result.episode).toBeInstanceOf(BrainEpisode);
        expect(result.series).toBeInstanceOf(BrainSeries);
        expect(result.series?.episodes.length).toEqual(1);
      });
    });

    when('[t1] called with prior series', () => {
      then('returns new series with prior episodes + new episode', async () => {
        const exchange1 = await genBrainExchange({
          with: { input: 'q1', output: 'a1', exid: null },
        });
        const episode1 = await genBrainEpisode({
          on: { episode: null },
          with: { exchange: exchange1, exid: null },
        });
        const priorSeries = await genBrainSeries({
          on: { series: null },
          with: { episode: episode1, exid: null },
        });

        const result = await genBrainContinuables({
          for: { grain: 'repl' },
          on: { series: priorSeries },
          with: { exchange: { input: 'q2', output: 'a2', exid: null } },
        });

        expect(result.series?.episodes.length).toEqual(2);
      });
    });

    when('[t2] called with prior episode only (no series)', () => {
      then('continues episode within new series', async () => {
        const exchange1 = await genBrainExchange({
          with: { input: 'q1', output: 'a1', exid: null },
        });
        const priorEpisode = await genBrainEpisode({
          on: { episode: null },
          with: { exchange: exchange1, exid: null },
        });

        const result = await genBrainContinuables({
          for: { grain: 'repl' },
          on: { episode: priorEpisode },
          with: { exchange: { input: 'q2', output: 'a2', exid: null } },
        });

        expect(result.episode.exchanges.length).toEqual(2);
        expect(result.series?.episodes.length).toEqual(1);
      });
    });
  });

  given('[case3] exid passthrough', () => {
    when('[t0] exids are provided', () => {
      then('episode and series have their respective exids', async () => {
        const result = await genBrainContinuables({
          for: { grain: 'repl' },
          on: {},
          with: {
            exchange: { input: 'q1', output: 'a1', exid: 'ex-123' },
            episode: { exid: 'ep-123' },
            series: { exid: 'sr-456' },
          },
        });

        expect(result.episode.exid).toEqual('ep-123');
        expect(result.series?.exid).toEqual('sr-456');
      });
    });

    when('[t1] exids are not provided', () => {
      then('episode and series have null exids', async () => {
        const result = await genBrainContinuables({
          for: { grain: 'repl' },
          on: {},
          with: { exchange: { input: 'q1', output: 'a1', exid: null } },
        });

        expect(result.episode.exid).toBeNull();
        expect(result.series?.exid).toBeNull();
      });
    });
  });
});
