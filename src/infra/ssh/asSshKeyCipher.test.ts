import { given, then, when } from 'test-fns';

import { asSshKeyCipher } from './asSshKeyCipher';

describe('asSshKeyCipher', () => {
  given('[case1] a valid unencrypted ed25519 openssh private key', () => {
    // this is a test key generated specifically for this test suite
    // DO NOT use this key for any purpose other than tests
    const testKeyContent = `-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACBdlTBLJjO8LlO24fqXxqfFHJ95QcFpQ4hJWWXLUG1xIwAAAJjBLCW1wSwl
tQAAAAtzc2gtZWQyNTUxOQAAACBdlTBLJjO8LlO24fqXxqfFHJ95QcFpQ4hJWWXLUG1xIw
AAAEBH8OVWuHCPSFQjJ7oLvNqjZMpR1mQKwJkHZPqNkfJvp12VMEsmM7wuU7bh+pfGp8Uc
n3lBwWlDiElZZctQbXEjAAAAEXRlc3RAZXhhbXBsZS5sb2NhbAECAwQF
-----END OPENSSH PRIVATE KEY-----`;

    when('[t0] asSshKeyCipher is called', () => {
      then('it returns none for the unencrypted key', () => {
        const cipher = asSshKeyCipher({ keyContent: testKeyContent });
        expect(cipher).toEqual('none');
      });
    });
  });

  given('[case2] a passphrase-protected key', () => {
    // this key has cipher != 'none'
    const protectedKeyContent = `-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAACmFlczI1Ni1jdHIAAAAGYmNyeXB0AAAAGAAAABBK7kJnHF
VQRnJ5lHRSAWBuAAAAEAAAAAEAAAAzAAAAC3NzaC1lZDI1NTE5AAAAIDVmNE1qNNE1RG9y
bXVDc3JZb3VyLWZha2Uta2V5AAAA
-----END OPENSSH PRIVATE KEY-----`;

    when('[t0] asSshKeyCipher is called', () => {
      then('it returns the cipher name (aes256-ctr)', () => {
        const cipher = asSshKeyCipher({ keyContent: protectedKeyContent });
        expect(cipher).toEqual('aes256-ctr');
      });
    });
  });
});
