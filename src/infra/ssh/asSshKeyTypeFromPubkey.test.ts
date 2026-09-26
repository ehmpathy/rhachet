import { asSshKeyTypeFromPubkey } from './asSshKeyTypeFromPubkey';

const TEST_CASES = [
  {
    description: 'reads the ed25519 token from a standard pubkey line',
    given: { pubkey: 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5 vlad@host' },
    expect: 'ssh-ed25519',
  },
  {
    description: 'reads the rsa token',
    given: { pubkey: 'ssh-rsa AAAAB3NzaC1yc2E comment' },
    expect: 'ssh-rsa',
  },
  {
    description: 'reads the ecdsa token',
    given: { pubkey: 'ecdsa-sha2-nistp256 AAAAE2VjZHNh comment' },
    expect: 'ecdsa-sha2-nistp256',
  },
  {
    description: 'reads the FIDO sk- token verbatim (not collapsed to ed25519)',
    given: { pubkey: 'sk-ssh-ed25519@openssh.com AAAAGnNr comment' },
    expect: 'sk-ssh-ed25519@openssh.com',
  },
  {
    description: 'tolerates a whitespace prefix',
    given: { pubkey: '   ssh-ed25519 AAAAC3NzaC1lZDI1NTE5 vlad@host' },
    expect: 'ssh-ed25519',
  },
  {
    description: 'returns empty string for an empty line',
    given: { pubkey: '' },
    expect: '',
  },
];

describe('asSshKeyTypeFromPubkey', () => {
  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      const type = asSshKeyTypeFromPubkey({ pubkey: thisCase.given.pubkey });
      expect(type).toEqual(thisCase.expect);
    }),
  );
});
