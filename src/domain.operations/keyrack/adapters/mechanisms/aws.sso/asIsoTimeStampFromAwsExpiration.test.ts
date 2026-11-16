import { isIsoTimeStamp } from 'iso-time';
import { given, then, when } from 'test-fns';

import { asIsoTimeStampFromAwsExpiration } from './asIsoTimeStampFromAwsExpiration';

const TEST_CASES = [
  {
    description: 'the offset form the aws cli writes',
    raw: '2026-11-15T01:32:06+00:00',
    output: '2026-11-15T01:32:06Z',
  },
  {
    description: 'a non-utc offset',
    raw: '2026-11-15T03:32:06+02:00',
    output: '2026-11-15T01:32:06Z',
  },
  {
    description: 'the utc Z form',
    raw: '2026-11-15T01:32:06Z',
    output: '2026-11-15T01:32:06Z',
  },
  { description: 'an absent value', raw: null, output: null },
  { description: 'an empty value', raw: '', output: null },
  { description: 'an unparseable value', raw: 'soon', output: null },
];

describe('asIsoTimeStampFromAwsExpiration', () => {
  given('[case1] the strict check on the cli shape', () => {
    when('[t0] the offset form is checked as-is', () => {
      then('the strict check rejects it, so a cast is owed', () => {
        expect(isIsoTimeStamp('2026-11-15T01:32:06+00:00')).toEqual(false);
      });
    });
  });

  given('[case2] each raw expiry shape', () => {
    TEST_CASES.map((thisCase) =>
      when(`[t] ${thisCase.description}`, () => {
        then(`casts to ${thisCase.output}`, () => {
          expect(
            asIsoTimeStampFromAwsExpiration({ raw: thisCase.raw }),
          ).toEqual(thisCase.output);
        });
      }),
    );
  });
});
