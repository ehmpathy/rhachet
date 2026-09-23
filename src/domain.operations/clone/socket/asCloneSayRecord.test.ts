import { given, then, when } from 'test-fns';

import type { CloneOndisk } from '@src/domain.objects/CloneOndisk';

import { asCloneSayRecord } from './asCloneSayRecord';
import type { CloneSayOutcome } from './computeCloneSayVerdict';

describe('asCloneSayRecord', () => {
  given('a released outcome and a slugged clone', () => {
    const outcome: CloneSayOutcome = {
      verdict: 'released',
      reason: null,
      probe: 'capable',
      delivered: true,
    };
    const clone = { serial: 'abc123', slug: 'worker-1' } as CloneOndisk;
    when('the record is built', () => {
      then('it carries the outcome fields beside the clone identity', () => {
        expect(asCloneSayRecord({ outcome, clone })).toEqual({
          delivered: true,
          verdict: 'released',
          reason: null,
          probe: 'capable',
          serial: 'abc123',
          slug: 'worker-1',
        });
      });
    });
  });

  given('a withheld outcome and an unslugged clone', () => {
    const outcome: CloneSayOutcome = {
      verdict: 'withheld',
      reason: 'modal-holds-focus',
      probe: 'capable',
      delivered: false,
    };
    const clone = { serial: 'def456', slug: null } as CloneOndisk;
    when('the record is built', () => {
      then('it carries the refusal reason and a null slug', () => {
        expect(asCloneSayRecord({ outcome, clone })).toEqual({
          delivered: false,
          verdict: 'withheld',
          reason: 'modal-holds-focus',
          probe: 'capable',
          serial: 'def456',
          slug: null,
        });
      });
    });
  });
});
