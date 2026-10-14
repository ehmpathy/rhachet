import { given, then, when } from 'test-fns';

import { asDeltaActorOutcomes } from './asDeltaActorOutcomes';

describe('asDeltaActorOutcomes', () => {
  given('[case1] a mix of rewritten, failed and untouched actors', () => {
    const cause = new Error('a write fault');
    const outcomes = [
      { rederived: { actorExid: 'hash=a', before: ['x', 'y'], after: ['x'] } },
      null,
      {
        failure: {
          scope: { kind: 'actor' as const, actorExid: 'hash=b' },
          cause,
        },
      },
      { rederived: { actorExid: 'hash=c', before: ['z'], after: [] } },
    ];

    when('[t0] the outcomes are split', () => {
      const split = asDeltaActorOutcomes({ outcomes });

      then('each rewritten actor lands in rederived, in order', () => {
        expect(split.rederived).toEqual([
          { actorExid: 'hash=a', before: ['x', 'y'], after: ['x'] },
          { actorExid: 'hash=c', before: ['z'], after: [] },
        ]);
      });

      then('each failed actor lands in failures', () => {
        expect(split.failures).toEqual([
          { scope: { kind: 'actor', actorExid: 'hash=b' }, cause },
        ]);
      });
    });
  });

  given('[case2] no outcomes', () => {
    when('[t0] the outcomes are split', () => {
      then('both lists are empty', () => {
        expect(asDeltaActorOutcomes({ outcomes: [] })).toEqual({
          rederived: [],
          failures: [],
        });
      });
    });
  });
});
