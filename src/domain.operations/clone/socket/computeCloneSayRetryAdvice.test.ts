import { given, then } from 'test-fns';

import {
  type CloneSayRetryAdvice,
  computeCloneSayRetryAdvice,
} from './computeCloneSayRetryAdvice';
import type { CloneSayVerdict } from './computeCloneSayVerdict';

const TEST_CASES: {
  description: string;
  given: { verdict: CloneSayVerdict };
  expect: CloneSayRetryAdvice;
}[] = [
  {
    description: 'released → no-resend (the brain took it)',
    given: { verdict: 'released' },
    expect: 'no-resend',
  },
  {
    description: 'enqueued → no-resend (the brain holds it)',
    given: { verdict: 'enqueued' },
    expect: 'no-resend',
  },
  {
    description:
      'withheld → resend (no pty write happened, a re-send cannot duplicate)',
    given: { verdict: 'withheld' },
    expect: 'resend',
  },
  {
    description:
      'buffered → verify-never-blind (our text sits in the region, a blind re-send wedges)',
    given: { verdict: 'buffered' },
    expect: 'verify-never-blind',
  },
  {
    description:
      'absent → verify-never-blind (delivered, yet a modal may have eaten it)',
    given: { verdict: 'absent' },
    expect: 'verify-never-blind',
  },
  {
    description:
      'unreadable → verify-never-blind (we do not know where it went)',
    given: { verdict: 'unreadable' },
    expect: 'verify-never-blind',
  },
  {
    description:
      'exited → no-resend (the clone ended as asked; no one is left to re-send to)',
    given: { verdict: 'exited' },
    expect: 'no-resend',
  },
];

describe('computeCloneSayRetryAdvice', () => {
  TEST_CASES.forEach((thisCase) =>
    given(thisCase.description, () => {
      then('it yields the expected retry advice', () => {
        expect(computeCloneSayRetryAdvice(thisCase.given)).toEqual(
          thisCase.expect,
        );
      });
    }),
  );

  given('the full set of verdicts', () => {
    then('every verdict is mapped — the contract is total', () => {
      const ALL_VERDICTS: CloneSayVerdict[] = [
        'released',
        'enqueued',
        'buffered',
        'withheld',
        'absent',
        'unreadable',
        'exited',
      ];
      expect(
        TEST_CASES.map((thisCase) => thisCase.given.verdict).sort(),
      ).toEqual([...ALL_VERDICTS].sort());
    });
  });
});
