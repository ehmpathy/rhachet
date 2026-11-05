import { given, then, when } from 'test-fns';

import { computeCloneAuthGateAction } from './computeCloneAuthGateAction';

const TEST_CASES = [
  {
    description: 'a passed gate with a writable peer processes the frames',
    given: { verdict: 'pass', peerWritable: true },
    expect: 'process',
  },
  {
    description:
      'a passed gate whose peer hung up (or half-closed) drops the frames',
    given: { verdict: 'pass', peerWritable: false },
    expect: 'drop-hung-up',
  },
  {
    description: 'a denied gate NACKs auth-denied',
    given: { verdict: 'deny', peerWritable: true },
    expect: 'nack-denied',
  },
  {
    description: 'a denied gate NACKs even when the peer hung up',
    given: { verdict: 'deny', peerWritable: false },
    expect: 'nack-denied',
  },
  {
    description: 'a timed-out gate NACKs auth-gate-timeout',
    given: { verdict: 'timeout', peerWritable: true },
    expect: 'nack-timeout',
  },
  {
    description: 'a timed-out gate NACKs even when the peer hung up',
    given: { verdict: 'timeout', peerWritable: false },
    expect: 'nack-timeout',
  },
] as const;

describe('computeCloneAuthGateAction', () => {
  TEST_CASES.map((thisCase) =>
    given(thisCase.description, () => {
      when('[t0] the action is computed', () => {
        then(`it is ${thisCase.expect}`, () => {
          expect(computeCloneAuthGateAction(thisCase.given)).toEqual(
            thisCase.expect,
          );
        });
      });
    }),
  );
});
