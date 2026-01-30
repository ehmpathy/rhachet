import { DomainLiteral } from 'domain-objects';
import { given, then, when } from 'test-fns';

import { BrainEpisode } from './BrainEpisode';
import { BrainExchange } from './BrainExchange';

describe('BrainEpisode', () => {
  given('[case1] valid BrainEpisode props', () => {
    const exchange1 = new BrainExchange({
      hash: 'ex1-hash',
      input: 'hello',
      output: 'world',
      exid: null,
    });
    const exchange2 = new BrainExchange({
      hash: 'ex2-hash',
      input: 'how are you',
      output: 'fine',
      exid: null,
    });

    when('[t0] BrainEpisode is instantiated with exchanges', () => {
      then('creates instance with all properties', () => {
        const episode = new BrainEpisode({
          hash: 'episode-hash',
          exchanges: [exchange1, exchange2],
          exid: 'ex-episode-001',
        });
        expect(episode.hash).toEqual('episode-hash');
        expect(episode.exchanges).toHaveLength(2);
        expect(episode.exchanges[0]).toEqual(exchange1);
        expect(episode.exchanges[1]).toEqual(exchange2);
        expect(episode.exid).toEqual('ex-episode-001');
      });

      then('extends DomainLiteral', () => {
        const episode = new BrainEpisode({
          hash: 'episode-hash',
          exchanges: [exchange1],
          exid: null,
        });
        expect(episode).toBeInstanceOf(DomainLiteral);
      });
    });
  });

  given('[case2] null exid (supplier did not provide)', () => {
    when('[t0] BrainEpisode is instantiated', () => {
      then('accepts null exid', () => {
        const episode = new BrainEpisode({
          hash: 'episode-hash',
          exchanges: [],
          exid: null,
        });
        expect(episode.exid).toBeNull();
      });
    });
  });

  given('[case3] empty exchanges array', () => {
    when('[t0] BrainEpisode is instantiated', () => {
      then('accepts empty exchanges array', () => {
        const episode = new BrainEpisode({
          hash: 'episode-hash',
          exchanges: [],
          exid: null,
        });
        expect(episode.exchanges).toHaveLength(0);
      });
    });
  });

  given('[case4] nested hydration', () => {
    when('[t0] BrainEpisode is instantiated with plain objects', () => {
      then('hydrates nested BrainExchange instances', () => {
        const episode = new BrainEpisode({
          hash: 'episode-hash',
          exchanges: [
            { hash: 'ex-hash', input: 'hello', output: 'world', exid: null },
          ],
          exid: null,
        });
        expect(episode.exchanges[0]).toBeInstanceOf(BrainExchange);
      });
    });
  });
});
