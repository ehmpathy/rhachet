import { given, then, when } from 'test-fns';

import {
  ed25519SeedToAgeIdentity,
  extractEd25519Seed,
  extractSshKeyCipher,
} from './sshPrikeyToAgeIdentity';

describe('sshPrikeyToAgeIdentity', () => {
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

    when('[t0] extractEd25519Seed is called', () => {
      then('it extracts the 32-byte seed', () => {
        const seed = extractEd25519Seed({ keyContent: testKeyContent });
        expect(seed).toBeInstanceOf(Uint8Array);
        expect(seed.length).toBe(32);
      });
    });

    when('[t1] ed25519SeedToAgeIdentity is called', () => {
      const seed = extractEd25519Seed({ keyContent: testKeyContent });

      then('it returns an AGE-SECRET-KEY- prefixed string', () => {
        const identity = ed25519SeedToAgeIdentity({ seed });
        expect(identity).toMatch(/^AGE-SECRET-KEY-1[A-Z0-9]+$/);
      });

      then('identity is deterministic for the same seed', () => {
        const identity1 = ed25519SeedToAgeIdentity({ seed });
        const identity2 = ed25519SeedToAgeIdentity({ seed });
        expect(identity1).toEqual(identity2);
      });
    });

    when('[t2] extractSshKeyCipher is called', () => {
      then('it returns none for unencrypted key', () => {
        const cipher = extractSshKeyCipher({ keyContent: testKeyContent });
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

    when('[t0] extractSshKeyCipher is called', () => {
      then('it returns the cipher name (aes256-ctr)', () => {
        const cipher = extractSshKeyCipher({ keyContent: protectedKeyContent });
        expect(cipher).toEqual('aes256-ctr');
      });
    });
  });

  given('[case3] an rsa key (truncated)', () => {
    // rsa keys have a different format - this truncated mock will fail at parse time
    const rsaKeyContent = `-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAABlwAAAAdzc2gtcn
NhAAAAAwEAAQAAAYEAtest
-----END OPENSSH PRIVATE KEY-----`;

    when('[t0] extractEd25519Seed is called', () => {
      then('it throws an error (truncated key fails at parse)', () => {
        expect(() =>
          extractEd25519Seed({ keyContent: rsaKeyContent }),
        ).toThrow();
      });
    });
  });

  given('[case4] invalid pem content', () => {
    const invalidContent = 'not a valid key';

    when('[t0] extractEd25519Seed is called', () => {
      then('it throws an error about invalid format', () => {
        expect(() =>
          extractEd25519Seed({ keyContent: invalidContent }),
        ).toThrow(/not a valid openssh/);
      });
    });
  });
});
