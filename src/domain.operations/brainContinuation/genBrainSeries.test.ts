import { given, then, useBeforeAll, when } from 'test-fns';

import { BrainSeries } from '../../domain.objects/BrainSeries';
import { genBrainEpisode } from './genBrainEpisode';
import { genBrainExchange } from './genBrainExchange';
import { genBrainSeries } from './genBrainSeries';

describe('genBrainSeries', () => {
  given('[case1] no prior series', () => {
    const episode = useBeforeAll(async () => {
      const exchange = await genBrainExchange({
        with: { input: 'hi', output: 'hello', exid: null },
      });
      return genBrainEpisode({
        on: { episode: null },
        with: { exchange, exid: null },
      });
    });

    when('[t0] genBrainSeries with null series', () => {
      then('returns a BrainSeries instance', async () => {
        const series = await genBrainSeries({
          on: { series: null },
          with: { episode, exid: null },
        });
        expect(series).toBeInstanceOf(BrainSeries);
      });

      then('has single episode', async () => {
        const series = await genBrainSeries({
          on: { series: null },
          with: { episode, exid: null },
        });
        expect(series.episodes).toHaveLength(1);
        expect(series.episodes[0]).toEqual(episode);
      });

      then('hash is deterministic', async () => {
        const sr1 = await genBrainSeries({
          on: { series: null },
          with: { episode, exid: null },
        });
        const sr2 = await genBrainSeries({
          on: { series: null },
          with: { episode, exid: null },
        });
        expect(sr1.hash).toEqual(sr2.hash);
      });
    });
  });

  given('[case2] prior series defined', () => {
    const scene = useBeforeAll(async () => {
      const exchange1 = await genBrainExchange({
        with: { input: 'hi', output: 'hello', exid: null },
      });
      const episode1 = await genBrainEpisode({
        on: { episode: null },
        with: { exchange: exchange1, exid: null },
      });
      const series1 = await genBrainSeries({
        on: { series: null },
        with: { episode: episode1, exid: null },
      });

      const exchange2 = await genBrainExchange({
        with: { input: 'bye', output: 'goodbye', exid: null },
      });
      const episode2 = await genBrainEpisode({
        on: { episode: null },
        with: { exchange: exchange2, exid: null },
      });

      return { series1, episode2 };
    });

    when('[t0] genBrainSeries with prior series', () => {
      then('new series has prior + new episodes', async () => {
        const series2 = await genBrainSeries({
          on: { series: scene.series1 },
          with: { episode: scene.episode2, exid: null },
        });
        expect(series2.episodes).toHaveLength(2);
      });

      then('does not mutate prior series', async () => {
        const beforeLen = scene.series1.episodes.length;
        await genBrainSeries({
          on: { series: scene.series1 },
          with: { episode: scene.episode2, exid: null },
        });
        expect(scene.series1.episodes.length).toEqual(beforeLen);
      });

      then('hash differs from prior series', async () => {
        const series2 = await genBrainSeries({
          on: { series: scene.series1 },
          with: { episode: scene.episode2, exid: null },
        });
        expect(series2.hash).not.toEqual(scene.series1.hash);
      });
    });
  });

  given('[case3] exid is preserved', () => {
    const episode = useBeforeAll(async () => {
      const exchange = await genBrainExchange({
        with: { input: 'hi', output: 'hello', exid: null },
      });
      return genBrainEpisode({
        on: { episode: null },
        with: { exchange, exid: null },
      });
    });

    when('[t0] exid is provided', () => {
      then('series has exid set', async () => {
        const series = await genBrainSeries({
          on: { series: null },
          with: { episode, exid: 'ex-series-123' },
        });
        expect(series.exid).toEqual('ex-series-123');
      });
    });

    when('[t1] exid is null', () => {
      then('series has exid as null', async () => {
        const series = await genBrainSeries({
          on: { series: null },
          with: { episode, exid: null },
        });
        expect(series.exid).toBeNull();
      });
    });
  });
});
