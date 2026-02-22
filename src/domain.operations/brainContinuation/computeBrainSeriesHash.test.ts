import { given, then, when } from 'test-fns';

import { BrainEpisode } from '@src/domain.objects/BrainEpisode';

import { computeBrainSeriesHash } from './computeBrainSeriesHash';

describe('computeBrainSeriesHash', () => {
  const episode1 = new BrainEpisode({
    hash: 'ep-hash-1',
    exchanges: [],
    exid: null,
  });
  const episode2 = new BrainEpisode({
    hash: 'ep-hash-2',
    exchanges: [],
    exid: null,
  });

  given('[case1] valid episodes', () => {
    when('[t0] hash is computed', () => {
      then('returns expected content-derived hash', async () => {
        const hash = await computeBrainSeriesHash({
          episodes: [episode1],
        });
        expect(hash).toEqual(
          'e757105d5bf31c97ad37e3e56aeddd4a885b6463f5edb8374af282bae4aec96c',
        );
      });

      then('hash is deterministic', async () => {
        const hash1 = await computeBrainSeriesHash({ episodes: [episode1] });
        const hash2 = await computeBrainSeriesHash({ episodes: [episode1] });
        expect(hash1).toEqual(hash2);
      });
    });
  });

  given('[case2] order-sensitive', () => {
    when('[t0] episodes are in different order', () => {
      then('hash differs', async () => {
        const hash1 = await computeBrainSeriesHash({
          episodes: [episode1, episode2],
        });
        const hash2 = await computeBrainSeriesHash({
          episodes: [episode2, episode1],
        });
        expect(hash1).not.toEqual(hash2);
      });
    });
  });

  given('[case3] empty episodes', () => {
    when('[t0] episodes array is empty', () => {
      then('returns expected content-derived hash', async () => {
        const hash = await computeBrainSeriesHash({ episodes: [] });
        expect(hash).toEqual(
          'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        );
      });
    });
  });
});
