import { isEd25519Pubkey } from './isEd25519Pubkey';

/**
 * .what = prove ed25519 detection gates the Variant A path (vision q4)
 */
describe('isEd25519Pubkey', () => {
  const TEST_CASES = [
    {
      description: 'true for an ssh-ed25519 pubkey',
      given: { pubkey: 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5 probe' },
      expect: true,
    },
    {
      description: 'true despite whitespace at the front',
      given: { pubkey: '  ssh-ed25519 AAAAC3NzaC1lZDI1NTE5' },
      expect: true,
    },
    {
      description: 'false for rsa',
      given: { pubkey: 'ssh-rsa AAAAB3NzaC1yc2E probe' },
      expect: false,
    },
    {
      description: 'false for ecdsa',
      given: { pubkey: 'ecdsa-sha2-nistp256 AAAA probe' },
      expect: false,
    },
    {
      description: 'false for a native age recipient',
      given: { pubkey: 'age1xyz...' },
      expect: false,
    },
  ];

  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(isEd25519Pubkey(thisCase.given)).toEqual(thisCase.expect);
    }),
  );
});
