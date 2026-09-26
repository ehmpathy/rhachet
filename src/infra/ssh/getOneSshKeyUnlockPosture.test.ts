import { given, then, when } from 'test-fns';

import { getOneSshKeyUnlockPosture } from './getOneSshKeyUnlockPosture';

/**
 * .what = proves the four-way unlock-posture classification the three call sites
 *         (sshPrikeyToAgeIdentity, genKeyrackRecipientSealed,
 *         migrateKeyrackManifestToVariantA) all now derive from
 */
describe('getOneSshKeyUnlockPosture', () => {
  const TEST_CASES = [
    {
      description: 'passwordless ed25519',
      given: { cipher: 'none', keyType: 'ssh-ed25519' },
      expected: 'passwordless',
    },
    {
      description: 'passwordless rsa',
      given: { cipher: 'none', keyType: 'ssh-rsa' },
      expected: 'passwordless',
    },
    {
      description: 'passphrased ed25519 -- the sign-as-kdf path',
      given: { cipher: 'aes256-ctr', keyType: 'ssh-ed25519' },
      expected: 'passphrased-ed25519',
    },
    {
      description: 'passphrased rsa -- the age-cli fallback',
      given: { cipher: 'aes256-ctr', keyType: 'ssh-rsa' },
      expected: 'passphrased-other',
    },
    {
      description: 'passphrased ecdsa -- the age-cli fallback',
      given: { cipher: 'bcrypt', keyType: 'ecdsa-sha2-nistp256' },
      expected: 'passphrased-other',
    },
    {
      description: 'passphrased FIDO ed25519 -- unsupported',
      given: { cipher: 'aes256-ctr', keyType: 'sk-ssh-ed25519@openssh.com' },
      expected: 'fido-unsupported',
    },
    {
      description:
        'passwordless FIDO ed25519 -- STILL unsupported (private half never touches disk)',
      given: { cipher: 'none', keyType: 'sk-ssh-ed25519@openssh.com' },
      expected: 'fido-unsupported',
    },
    {
      description: 'passphrased FIDO ecdsa -- unsupported',
      given: {
        cipher: 'aes256-ctr',
        keyType: 'sk-ecdsa-sha2-nistp256@openssh.com',
      },
      expected: 'fido-unsupported',
    },
  ];

  given('a set of {cipher, keyType} pairs', () => {
    TEST_CASES.map((thisCase) =>
      when(`[t] ${thisCase.description}`, () => {
        then(`it classifies as ${thisCase.expected}`, () => {
          expect(getOneSshKeyUnlockPosture(thisCase.given)).toEqual(
            thisCase.expected,
          );
        });
      }),
    );
  });
});
