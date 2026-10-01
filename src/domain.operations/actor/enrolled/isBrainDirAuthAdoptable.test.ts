import { given, then, when } from 'test-fns';

import { genSampleBrainAuth } from '@src/.test/assets/genSampleBrainAuth';

import { isBrainDirAuthAdoptable } from './isBrainDirAuthAdoptable';

const LOGIN_LIVE = genSampleBrainAuth({ state: 'live', expiresAt: 2000 });
const LOGIN_LIVE_OLDER = genSampleBrainAuth({ state: 'live', expiresAt: 1000 });
const LOGIN_DEAD = genSampleBrainAuth({ state: 'dead', expiresAt: 0 });

const TEST_CASES = [
  {
    description: 'the shared login is dead, the brain-dir login is live',
    brainAuthContent: LOGIN_DEAD,
    brainDirAuthContent: LOGIN_LIVE,
    expected: true,
  },
  {
    description: 'the shared login is absent, the brain-dir login is live',
    brainAuthContent: null,
    brainDirAuthContent: LOGIN_LIVE,
    expected: true,
  },
  {
    description:
      'the shared login is live and older than the brain-dir login — a peer may refresh it',
    brainAuthContent: LOGIN_LIVE_OLDER,
    brainDirAuthContent: LOGIN_LIVE,
    expected: false,
  },
  {
    description: 'the shared login is dead, the brain-dir login is dead too',
    brainAuthContent: LOGIN_DEAD,
    brainDirAuthContent: LOGIN_DEAD,
    expected: false,
  },
  {
    description: 'the shared login is absent, the brain-dir login dangles',
    brainAuthContent: null,
    brainDirAuthContent: null,
    expected: false,
  },
  {
    description: 'the shared login does not parse — claude-code judges it',
    brainAuthContent: 'not json',
    brainDirAuthContent: LOGIN_LIVE,
    expected: false,
  },
] as const;

describe('isBrainDirAuthAdoptable', () => {
  TEST_CASES.map((thisCase) =>
    given(`[case] ${thisCase.description}`, () => {
      when('[t0] the two logins are compared', () => {
        then(`reads as ${thisCase.expected}`, () => {
          expect(
            isBrainDirAuthAdoptable({
              brainAuthContent: thisCase.brainAuthContent,
              brainDirAuthContent: thisCase.brainDirAuthContent,
            }),
          ).toEqual(thisCase.expected);
        });
      });
    }),
  );
});
