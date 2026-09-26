import * as age from 'age-encryption';

import { isAgeCiphertextSshSealed } from './isAgeCiphertextSshSealed';

/**
 * .what = armor an age header of the given recipient type
 * .why = the detector reads the de-armored cleartext header; a round-trip via
 *        age.armor lets each case build a realistic armored ciphertext with no age-cli
 */
const asArmoredHeader = (stanza: string): string =>
  age.armor.encode(
    new TextEncoder().encode(
      `age-encryption.org/v1\n${stanza}\nBodyBodyBody\n--- MacMacMac\npayload`,
    ),
  );

const TEST_CASES = [
  {
    description: 'a raw ssh-ed25519 stanza (legacy v0) is ssh-sealed',
    given: { ciphertext: asArmoredHeader('-> ssh-ed25519 Xy1Ab2 c3D4e5F6') },
    expect: { sealed: true },
  },
  {
    description: 'a raw ssh-rsa stanza (legacy v0) is ssh-sealed',
    given: { ciphertext: asArmoredHeader('-> ssh-rsa Xy1Ab2 c3D4e5F6') },
    expect: { sealed: true },
  },
  {
    description: 'an X25519 stanza (derive-not-store v1) is NOT ssh-sealed',
    given: { ciphertext: asArmoredHeader('-> X25519 c3D4e5F6g7H8') },
    expect: { sealed: false },
  },
  {
    description:
      'a non-armored / corrupt input is NOT ssh-sealed (best-effort sniff)',
    given: { ciphertext: 'not an age file at all' },
    expect: { sealed: false },
  },
] as const;

describe('isAgeCiphertextSshSealed', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      const sealed = isAgeCiphertextSshSealed({
        ciphertext: thisCase.given.ciphertext,
      });
      expect(sealed).toEqual(thisCase.expect.sealed);
    }),
  );
});
