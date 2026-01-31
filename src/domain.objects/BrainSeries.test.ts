import { DomainLiteral } from 'domain-objects';
import { given, then, when } from 'test-fns';

import { BrainEpisode } from './BrainEpisode';
import { BrainExchange } from './BrainExchange';
import { BrainSeries } from './BrainSeries';

describe('BrainSeries', () => {
  given('[case1] valid BrainSeries props', () => {
    const exchange = new BrainExchange({
      hash: 'ex-hash',
      input: 'hello',
      output: 'world',
      exid: null,
    });
    const episode1 = new BrainEpisode({
      hash: 'ep1-hash',
      exchanges: [exchange],
      exid: null,
    });
    const episode2 = new BrainEpisode({
      hash: 'ep2-hash',
      exchanges: [exchange],
      exid: null,
    });

    when('[t0] BrainSeries is instantiated with episodes', () => {
      then('creates instance with all properties', () => {
        const series = new BrainSeries({
          hash: 'series-hash',
          episodes: [episode1, episode2],
          exid: 'ex-series-001',
        });
        expect(series.hash).toEqual('series-hash');
        expect(series.episodes).toHaveLength(2);
        expect(series.episodes[0]).toEqual(episode1);
        expect(series.episodes[1]).toEqual(episode2);
        expect(series.exid).toEqual('ex-series-001');
      });

      then('extends DomainLiteral', () => {
        const series = new BrainSeries({
          hash: 'series-hash',
          episodes: [episode1],
          exid: null,
        });
        expect(series).toBeInstanceOf(DomainLiteral);
      });
    });
  });

  given('[case2] null exid (supplier did not provide)', () => {
    when('[t0] BrainSeries is instantiated', () => {
      then('accepts null exid', () => {
        const series = new BrainSeries({
          hash: 'series-hash',
          episodes: [],
          exid: null,
        });
        expect(series.exid).toBeNull();
      });
    });
  });

  given('[case3] nested hydration', () => {
    when('[t0] BrainSeries is instantiated with plain objects', () => {
      then('hydrates nested BrainEpisode instances', () => {
        const series = new BrainSeries({
          hash: 'series-hash',
          episodes: [
            {
              hash: 'ep-hash',
              exchanges: [
                { hash: 'ex-hash', input: 'hi', output: 'bye', exid: null },
              ],
              exid: null,
            },
          ],
          exid: null,
        });
        expect(series.episodes[0]).toBeInstanceOf(BrainEpisode);
        expect(series.episodes[0]!.exchanges[0]).toBeInstanceOf(BrainExchange);
      });
    });
  });
});
