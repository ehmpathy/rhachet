import { given, then, when } from 'test-fns';

import {
  asBootCacheLeadDecision,
  BOOT_CACHE_LEAD_UNANSWERED_MS,
  BOOT_CACHE_LEAD_UNSENT_MS,
  BOOT_CACHE_WARM_MS,
} from './asBootCacheLeadDecision';

const NOW = 1_000_000_000;
const SELF = 'serial-self';
const PEER = 'serial-peer';

const TEST_CASES = [
  {
    description: 'no lead: the first say claims it',
    given: {
      lead: null,
      leadStarted: false,
      leadAnswered: false,
      leadLive: false,
    },
    expect: { kind: 'claim' },
  },
  {
    description: 'the clone is itself the lead: it claims again',
    given: {
      lead: { serial: SELF, claimedAtMs: NOW - 1_000 },
      leadStarted: true,
      leadAnswered: false,
      leadLive: true,
    },
    expect: { kind: 'claim' },
  },
  {
    description:
      'a live lead that sent its request, unanswered: wait to the long bound',
    given: {
      lead: { serial: PEER, claimedAtMs: NOW - 2_000 },
      leadStarted: true,
      leadAnswered: false,
      leadLive: true,
    },
    expect: {
      kind: 'wait',
      untilMs: NOW - 2_000 + BOOT_CACHE_LEAD_UNANSWERED_MS,
    },
  },
  {
    description:
      'a live lead that has not sent yet, just claimed: wait to the short bound',
    given: {
      lead: { serial: PEER, claimedAtMs: NOW - 1_000 },
      leadStarted: false,
      leadAnswered: false,
      leadLive: true,
    },
    expect: { kind: 'wait', untilMs: NOW - 1_000 + BOOT_CACHE_LEAD_UNSENT_MS },
  },
  {
    description:
      'a live lead that sent naught in its short window: claim, it writes no boot',
    given: {
      lead: { serial: PEER, claimedAtMs: NOW - BOOT_CACHE_LEAD_UNSENT_MS - 1 },
      leadStarted: false,
      leadAnswered: false,
      leadLive: true,
    },
    expect: { kind: 'claim' },
  },
  {
    description:
      'a lead that answered within the cache window: warm, go at once',
    given: {
      lead: { serial: PEER, claimedAtMs: NOW - 60_000 },
      leadStarted: true,
      leadAnswered: true,
      leadLive: false,
    },
    expect: { kind: 'warm' },
  },
  {
    description:
      'a lead that answered past the cache window: claim, the entry may be gone',
    given: {
      lead: { serial: PEER, claimedAtMs: NOW - BOOT_CACHE_WARM_MS - 1 },
      leadStarted: true,
      leadAnswered: true,
      leadLive: true,
    },
    expect: { kind: 'claim' },
  },
  {
    description:
      'a sent request unanswered past the long bound: claim, never wait forever',
    given: {
      lead: {
        serial: PEER,
        claimedAtMs: NOW - BOOT_CACHE_LEAD_UNANSWERED_MS - 1,
      },
      leadStarted: true,
      leadAnswered: false,
      leadLive: true,
    },
    expect: { kind: 'claim' },
  },
  {
    description: 'a lead that died unanswered: claim at once',
    given: {
      lead: { serial: PEER, claimedAtMs: NOW - 2_000 },
      leadStarted: true,
      leadAnswered: false,
      leadLive: false,
    },
    expect: { kind: 'claim' },
  },
] as const;

describe('asBootCacheLeadDecision', () => {
  TEST_CASES.map((thisCase) =>
    given(thisCase.description, () => {
      when('[t0] the first say asks the gate for its decision', () => {
        then('the decision matches', () => {
          expect(
            asBootCacheLeadDecision({
              ...thisCase.given,
              selfSerial: SELF,
              nowMs: NOW,
            }),
          ).toEqual(thisCase.expect);
        });
      });
    }),
  );
});
