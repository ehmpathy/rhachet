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
];

describe('computeCloneSayRetryAdvice', () => {
  TEST_CASES.forEach((thisCase) =>
    test(thisCase.description, () => {
      expect(computeCloneSayRetryAdvice(thisCase.given)).toEqual(
        thisCase.expect,
      );
    }),
  );

  test('every one of the six verdicts is mapped — the contract is total', () => {
    const ALL_VERDICTS: CloneSayVerdict[] = [
      'released',
      'enqueued',
      'buffered',
      'withheld',
      'absent',
      'unreadable',
    ];
    expect(TEST_CASES.map((thisCase) => thisCase.given.verdict).sort()).toEqual(
      [...ALL_VERDICTS].sort(),
    );
  });
});
