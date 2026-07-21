import { given, then, when } from 'test-fns';

import { getRoleSlugsForFlags } from './getRoleSlugsForFlags';

describe('getRoleSlugsForFlags', () => {
  given('[case1] no classification (no --roles passed)', () => {
    when('[t0] classified is null', () => {
      then('yields an empty slug list', () => {
        expect(getRoleSlugsForFlags({ classified: null })).toEqual([]);
      });
    });
  });

  given('[case2] an absolute classification', () => {
    when('[t0] mode is absolute', () => {
      then('yields the absolute slugs', () => {
        expect(
          getRoleSlugsForFlags({
            classified: {
              mode: 'absolute',
              absolutes: ['mechanic', 'behaver'],
            },
          }),
        ).toEqual(['mechanic', 'behaver']);
      });
    });
  });

  given('[case3] an incremental classification', () => {
    when('[t0] mode is incremental with additions and subtractions', () => {
      then(
        'yields only the addition slugs (flags act on additions, never subtractions)',
        () => {
          expect(
            getRoleSlugsForFlags({
              classified: {
                mode: 'incremental',
                additions: ['architect'],
                subtractions: ['reviewer'],
              },
            }),
          ).toEqual(['architect']);
        },
      );
    });
  });
});
