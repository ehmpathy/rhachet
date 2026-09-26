import { given, then, when } from 'test-fns';

import { asEd25519Seed } from './asEd25519Seed';

describe('asEd25519Seed', () => {
  given('[case1] a valid ed25519 openssh private key', () => {
    // this is a test key generated specifically for this test suite
    // DO NOT use this key for any purpose other than tests
    const testKeyContent = `-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACBdlTBLJjO8LlO24fqXxqfFHJ95QcFpQ4hJWWXLUG1xIwAAAJjBLCW1wSwl
tQAAAAtzc2gtZWQyNTUxOQAAACBdlTBLJjO8LlO24fqXxqfFHJ95QcFpQ4hJWWXLUG1xIw
AAAEBH8OVWuHCPSFQjJ7oLvNqjZMpR1mQKwJkHZPqNkfJvp12VMEsmM7wuU7bh+pfGp8Uc
n3lBwWlDiElZZctQbXEjAAAAEXRlc3RAZXhhbXBsZS5sb2NhbAECAwQF
-----END OPENSSH PRIVATE KEY-----`;

    when('[t0] asEd25519Seed is called', () => {
      then('it extracts the 32-byte seed', () => {
        const seed = asEd25519Seed({ keyContent: testKeyContent });
        expect(seed).toBeInstanceOf(Uint8Array);
        expect(seed.length).toBe(32);
      });
    });
  });

  given('[case2] an rsa key (truncated)', () => {
    // rsa keys have a different format - this truncated mock will fail at parse time
    const rsaKeyContent = `-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAABlwAAAAdzc2gtcn
NhAAAAAwEAAQAAAYEAtest
-----END OPENSSH PRIVATE KEY-----`;

    when('[t0] asEd25519Seed is called', () => {
      then('it throws an error (truncated key fails at parse)', () => {
        expect(() => asEd25519Seed({ keyContent: rsaKeyContent })).toThrow();
      });
    });
  });

  given('[case3] invalid pem content', () => {
    const invalidContent = 'not a valid key';

    when('[t0] asEd25519Seed is called', () => {
      then('it throws an error about invalid format', () => {
        expect(() => asEd25519Seed({ keyContent: invalidContent })).toThrow(
          /not a valid openssh/,
        );
      });
    });
  });
});
