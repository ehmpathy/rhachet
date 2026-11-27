import { asIsoTimeStamp } from 'iso-time';

import { getAllKeyrackRenewalsUnfiled } from './getAllKeyrackRenewalsUnfiled';

const EXPIRES_AT_MAX = asIsoTimeStamp('2026-11-20T03:00:00.000Z');
const RENEWALS_SENT = [
  { slug: 'ahbode.camp.AWS_PROFILE', expiresAtMax: EXPIRES_AT_MAX },
  { slug: 'ahbode.prep.AWS_PROFILE', expiresAtMax: EXPIRES_AT_MAX },
];

const TEST_CASES = [
  {
    description: 'a daemon that filed every renewal leaves none unfiled',
    given: {
      renewalsSent: RENEWALS_SENT,
      renewable: ['ahbode.camp.AWS_PROFILE', 'ahbode.prep.AWS_PROFILE'],
    },
    expect: { output: [] },
  },
  {
    description: 'a daemon too old to reply leaves every renewal unfiled',
    given: { renewalsSent: RENEWALS_SENT, renewable: null },
    expect: {
      output: ['ahbode.camp.AWS_PROFILE', 'ahbode.prep.AWS_PROFILE'],
    },
  },
  {
    description: 'a partial reply names only the gap',
    given: {
      renewalsSent: RENEWALS_SENT,
      renewable: ['ahbode.camp.AWS_PROFILE'],
    },
    expect: { output: ['ahbode.prep.AWS_PROFILE'] },
  },
  {
    description:
      'no renewals sent leaves none unfiled, whatever the daemon age',
    given: { renewalsSent: [], renewable: null },
    expect: { output: [] },
  },
];

describe('getAllKeyrackRenewalsUnfiled', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(getAllKeyrackRenewalsUnfiled(thisCase.given)).toEqual(
        thisCase.expect.output,
      );
    }),
  );
});
