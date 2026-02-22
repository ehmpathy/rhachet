import { given, then, when } from 'test-fns';

import { BrainExchange } from '@src/domain.objects/BrainExchange';

import { computeBrainEpisodeHash } from './computeBrainEpisodeHash';

describe('computeBrainEpisodeHash', () => {
  const exchange1 = new BrainExchange({
    hash: 'hash-1',
    input: 'hello',
    output: 'world',
    exid: null,
  });
  const exchange2 = new BrainExchange({
    hash: 'hash-2',
    input: 'foo',
    output: 'bar',
    exid: null,
  });

  given('[case1] valid exchanges', () => {
    when('[t0] hash is computed', () => {
      then('returns expected content-derived hash', async () => {
        const hash = await computeBrainEpisodeHash({
          exchanges: [exchange1],
        });
        expect(hash).toEqual(
          '73a370509b33f7d64369bf097335b57c4021bd28e33a3f12c1b622fd62222374',
        );
      });

      then('hash is deterministic', async () => {
        const hash1 = await computeBrainEpisodeHash({ exchanges: [exchange1] });
        const hash2 = await computeBrainEpisodeHash({ exchanges: [exchange1] });
        expect(hash1).toEqual(hash2);
      });
    });
  });

  given('[case2] order-sensitive', () => {
    when('[t0] exchanges are in different order', () => {
      then('hash differs', async () => {
        const hash1 = await computeBrainEpisodeHash({
          exchanges: [exchange1, exchange2],
        });
        const hash2 = await computeBrainEpisodeHash({
          exchanges: [exchange2, exchange1],
        });
        expect(hash1).not.toEqual(hash2);
      });
    });
  });

  given('[case3] empty exchanges', () => {
    when('[t0] exchanges array is empty', () => {
      then('returns expected content-derived hash', async () => {
        const hash = await computeBrainEpisodeHash({ exchanges: [] });
        expect(hash).toEqual(
          'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        );
      });
    });
  });
});
