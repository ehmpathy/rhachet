import { given, then, when } from 'test-fns';

import { isFidoSshKeyType } from './isFidoSshKeyType';

const TEST_CASES = [
  { keyType: 'sk-ssh-ed25519@openssh.com', expected: true },
  { keyType: 'sk-ecdsa-sha2-nistp256@openssh.com', expected: true },
  { keyType: 'ssh-ed25519', expected: false },
  { keyType: 'ssh-rsa', expected: false },
  { keyType: 'ecdsa-sha2-nistp256', expected: false },
];

describe('isFidoSshKeyType', () => {
  given('a set of openssh key-type tokens', () => {
    TEST_CASES.map(({ keyType, expected }) =>
      when(`[t] the type is "${keyType}"`, () => {
        then(`it is ${expected ? '' : 'not '}a FIDO key`, () => {
          expect(isFidoSshKeyType({ keyType })).toBe(expected);
        });
      }),
    );
  });
});
