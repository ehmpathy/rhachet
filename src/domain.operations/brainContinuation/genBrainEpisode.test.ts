import { given, then, useBeforeAll, when } from 'test-fns';

import { BrainEpisode } from '../../domain.objects/BrainEpisode';
import { genBrainEpisode } from './genBrainEpisode';
import { genBrainExchange } from './genBrainExchange';

describe('genBrainEpisode', () => {
  given('[case1] no prior episode', () => {
    const exchange = useBeforeAll(async () =>
      genBrainExchange({ with: { input: 'hi', output: 'hello', exid: null } }),
    );

    when('[t0] genBrainEpisode with null episode', () => {
      then('returns a BrainEpisode instance', async () => {
        const episode = await genBrainEpisode({
          on: { episode: null },
          with: { exchange, exid: null },
        });
        expect(episode).toBeInstanceOf(BrainEpisode);
      });

      then('has single exchange', async () => {
        const episode = await genBrainEpisode({
          on: { episode: null },
          with: { exchange, exid: null },
        });
        expect(episode.exchanges).toHaveLength(1);
        expect(episode.exchanges[0]).toEqual(exchange);
      });

      then('hash is deterministic', async () => {
        const ep1 = await genBrainEpisode({
          on: { episode: null },
          with: { exchange, exid: null },
        });
        const ep2 = await genBrainEpisode({
          on: { episode: null },
          with: { exchange, exid: null },
        });
        expect(ep1.hash).toEqual(ep2.hash);
      });
    });
  });

  given('[case2] prior episode defined', () => {
    const scene = useBeforeAll(async () => {
      const exchange1 = await genBrainExchange({
        with: { input: 'hi', output: 'hello', exid: null },
      });
      const episode1 = await genBrainEpisode({
        on: { episode: null },
        with: { exchange: exchange1, exid: null },
      });
      const exchange2 = await genBrainExchange({
        with: { input: 'bye', output: 'goodbye', exid: null },
      });
      return { episode1, exchange2 };
    });

    when('[t0] genBrainEpisode with prior episode', () => {
      then('new episode has prior + new exchanges', async () => {
        const episode2 = await genBrainEpisode({
          on: { episode: scene.episode1 },
          with: { exchange: scene.exchange2, exid: null },
        });
        expect(episode2.exchanges).toHaveLength(2);
      });

      then('does not mutate prior episode', async () => {
        const beforeLen = scene.episode1.exchanges.length;
        await genBrainEpisode({
          on: { episode: scene.episode1 },
          with: { exchange: scene.exchange2, exid: null },
        });
        expect(scene.episode1.exchanges.length).toEqual(beforeLen);
      });

      then('hash differs from prior episode', async () => {
        const episode2 = await genBrainEpisode({
          on: { episode: scene.episode1 },
          with: { exchange: scene.exchange2, exid: null },
        });
        expect(episode2.hash).not.toEqual(scene.episode1.hash);
      });
    });
  });

  given('[case3] exid is preserved', () => {
    const exchange = useBeforeAll(async () =>
      genBrainExchange({ with: { input: 'hi', output: 'hello', exid: null } }),
    );

    when('[t0] exid is provided', () => {
      then('episode has exid set', async () => {
        const episode = await genBrainEpisode({
          on: { episode: null },
          with: { exchange, exid: 'ex-episode-123' },
        });
        expect(episode.exid).toEqual('ex-episode-123');
      });
    });

    when('[t1] exid is null', () => {
      then('episode has exid as null', async () => {
        const episode = await genBrainEpisode({
          on: { episode: null },
          with: { exchange, exid: null },
        });
        expect(episode.exid).toBeNull();
      });
    });
  });
});
