import { given, then, when } from 'test-fns';

import type { CloneGetReply } from './asCloneGetReply';
import { computeCloneSayBaseline } from './computeCloneSayBaseline';

describe('computeCloneSayBaseline', () => {
  given('a capable probe reply', () => {
    const probe: CloneGetReply = {
      probe: 'capable',
      state: {
        focus: 'input',
        input: 'clear',
        countInInput: 2,
        countOnScreen: 5,
        // a baseline carries COUNTS only — `queued` is present-tense state, never differenced,
        // so it has no place in a pre-write snapshot (see asCloneObservationScreen)
        queued: false,
      },
    };
    when('the baseline is derived', () => {
      then('it carries the transcript count and both screen counts', () => {
        expect(computeCloneSayBaseline({ transcriptCount: 7, probe })).toEqual({
          transcriptCount: 7,
          countInInput: 2,
          countOnScreen: 5,
        });
      });
    });
  });

  given('a probe-blind reply (unsupported)', () => {
    const probe: CloneGetReply = {
      probe: 'unsupported',
      reason: 'peer-probe-blind',
    };
    when('the baseline is derived', () => {
      then(
        'the counts collapse to null (unmeasured), the transcript count survives — a null baseline cannot mint a false rise (r006-i010-b1)',
        () => {
          expect(
            computeCloneSayBaseline({ transcriptCount: 3, probe }),
          ).toEqual({
            transcriptCount: 3,
            countInInput: null,
            countOnScreen: null,
          });
        },
      );
    });
  });
});
