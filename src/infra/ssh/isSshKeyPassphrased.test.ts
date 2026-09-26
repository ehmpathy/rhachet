import { isSshKeyPassphrased } from './isSshKeyPassphrased';

/**
 * .what = prove passphrase detection: 'none' cipher → false, any other → true
 * .why  = the headless guard leans on this to spare a passphrase-less key (which
 *         needs no dialog) from the headless fail-fast
 */
describe('isSshKeyPassphrased', () => {
  const UNENCRYPTED = `-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACBdlTBLJjO8LlO24fqXxqfFHJ95QcFpQ4hJWWXLUG1xIwAAAJjBLCW1wSwl
tQAAAAtzc2gtZWQyNTUxOQAAACBdlTBLJjO8LlO24fqXxqfFHJ95QcFpQ4hJWWXLUG1xIw
AAAEBH8OVWuHCPSFQjJ7oLvNqjZMpR1mQKwJkHZPqNkfJvp12VMEsmM7wuU7bh+pfGp8Uc
n3lBwWlDiElZZctQbXEjAAAAEXRlc3RAZXhhbXBsZS5sb2NhbAECAwQF
-----END OPENSSH PRIVATE KEY-----`;

  const PASSPHRASED = `-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAACmFlczI1Ni1jdHIAAAAGYmNyeXB0AAAAGAAAABBK7kJnHF
VQRnJ5lHRSAWBuAAAAEAAAAAEAAAAzAAAAC3NzaC1lZDI1NTE5AAAAIDVmNE1qNNE1RG9y
bXVDc3JZb3VyLWZha2Uta2V5AAAA
-----END OPENSSH PRIVATE KEY-----`;

  const CASES = [
    {
      description: "cipher 'none' → not passphrased",
      keyContent: UNENCRYPTED,
      expected: false,
    },
    {
      description: 'cipher aes256-ctr → passphrased',
      keyContent: PASSPHRASED,
      expected: true,
    },
  ];

  CASES.map((thisCase) =>
    test(thisCase.description, () => {
      expect(isSshKeyPassphrased({ keyContent: thisCase.keyContent })).toEqual(
        thisCase.expected,
      );
    }),
  );
});
