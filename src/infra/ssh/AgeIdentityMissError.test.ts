import { isAgeIdentityMissMessage } from './AgeIdentityMissError';

/**
 * .what = unit-proves the shared recipient-miss predicate recognizes BOTH the
 *         npm-age phrase and the age-cli phrase, and rejects genuine faults
 * .why  = the predicate is the single source of truth both decrypt paths funnel
 *         through; a clamp here goes red if a future edit narrows it back to one
 *         phrase and silently drops the other path's miss-detection
 */
const CASES: { description: string; message: string; expected: boolean }[] = [
  {
    description: 'npm-age library phrase (with "file\'s")',
    message: "no identity matched any of the file's recipients",
    expected: true,
  },
  {
    description: 'age-cli phrase (without "file\'s")',
    message: 'age: error: no identity matched any of the recipients',
    expected: true,
  },
  {
    description: 'age-cli message wrapped by execFileSync "Command failed"',
    message:
      'Command failed: age -d -i key.txt\nage: error: no identity matched any of the recipients',
    expected: true,
  },
  {
    description: 'a genuine wrong-passphrase fault is NOT a miss',
    message: 'age: error: incorrect passphrase',
    expected: false,
  },
  {
    description: 'a corrupt-ciphertext fault is NOT a miss',
    message: 'age: error: failed to read header: unexpected EOF',
    expected: false,
  },
  {
    description: 'an unrelated i/o fault is NOT a miss',
    message: 'ENOENT: no such file or directory',
    expected: false,
  },
];

describe('isAgeIdentityMissMessage', () => {
  CASES.forEach((thisCase) =>
    test(thisCase.description, () => {
      expect(isAgeIdentityMissMessage(thisCase.message)).toEqual(
        thisCase.expected,
      );
    }),
  );
});
