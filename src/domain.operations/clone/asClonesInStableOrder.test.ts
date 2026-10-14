import { asIsoTimeStamp } from 'iso-time';
import { given, then, when } from 'test-fns';

import { asClonesInStableOrder } from './asClonesInStableOrder';

describe('asClonesInStableOrder', () => {
  given('[case1] clones out of spawn order, two with one spawnedAt', () => {
    const clones = [
      { serial: 'c', spawnedAt: asIsoTimeStamp('2026-10-04T00:00:02.000Z') },
      { serial: 'b', spawnedAt: asIsoTimeStamp('2026-10-04T00:00:01.000Z') },
      { serial: 'a', spawnedAt: asIsoTimeStamp('2026-10-04T00:00:02.000Z') },
    ];

    when('[t0] ordered', () => {
      const ordered = asClonesInStableOrder({ clones });

      then('spawnedAt asc, then serial asc', () => {
        expect(ordered.map((clone) => clone.serial)).toEqual(['b', 'a', 'c']);
      });

      then('the caller array is never mutated', () => {
        expect(clones.map((clone) => clone.serial)).toEqual(['c', 'b', 'a']);
      });
    });
  });
});
