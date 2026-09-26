import { asRedactedAgeIdentity } from './asRedactedAgeIdentity';

/**
 * .what = prove the redactor hides age secret-key material but keeps non-secret diagnostics
 * .why  = the derived unlock identity K must never reach an error message, a log, or a
 *         committed snapshot (derive-not-store security promise); a path/marker is not
 *         secret and stays legible for diagnostics
 */
const TEST_CASES = [
  {
    description: 'redacts an age secret key to a non-secret placeholder',
    given: {
      identity:
        'AGE-SECRET-KEY-1QX4MV2EPN56YDQSJE5TYGR3P49J0RHYZN7Q2MUEEAFLX4HTQSX2QF9J7D9',
    },
    expect: { output: 'AGE-SECRET-KEY-<redacted>' },
  },
  {
    description: 'never leaks any character of the secret suffix',
    given: {
      identity:
        'AGE-SECRET-KEY-1QX4MV2EPN56YDQSJE5TYGR3P49J0RHYZN7Q2MUEEAFLX4HTQSX2QF9J7D9',
    },
    expect: {
      notContains:
        '1QX4MV2EPN56YDQSJE5TYGR3P49J0RHYZN7Q2MUEEAFLX4HTQSX2QF9J7D9',
    },
  },
  {
    description:
      'passes an ssh key path through unchanged (not secret, diagnostic)',
    given: { identity: '/home/vlad/.ssh/id_ed25519' },
    expect: { output: '/home/vlad/.ssh/id_ed25519' },
  },
  {
    description: 'passes an ssh-key-path marker through unchanged',
    given: { identity: 'ssh-key-path://home/vlad/.ssh/id_rsa' },
    expect: { output: 'ssh-key-path://home/vlad/.ssh/id_rsa' },
  },
];

describe('asRedactedAgeIdentity', () => {
  for (const thisCase of TEST_CASES) {
    test(thisCase.description, () => {
      const output = asRedactedAgeIdentity(thisCase.given.identity);
      if (thisCase.expect.output !== undefined)
        expect(output).toEqual(thisCase.expect.output);
      if (thisCase.expect.notContains !== undefined)
        expect(output).not.toContain(thisCase.expect.notContains);
    });
  }
});
