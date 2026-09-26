import { given, then, when } from 'test-fns';

import { asAgeIdentityFromEd25519Seed } from './asAgeIdentityFromEd25519Seed';
import { asEd25519Seed } from './asEd25519Seed';

describe('asAgeIdentityFromEd25519Seed', () => {
  given('[case1] a seed extracted from a valid ed25519 key', () => {
    // this is a test key generated specifically for this test suite
    // DO NOT use this key for any purpose other than tests
    const testKeyContent = `-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACBdlTBLJjO8LlO24fqXxqfFHJ95QcFpQ4hJWWXLUG1xIwAAAJjBLCW1wSwl
tQAAAAtzc2gtZWQyNTUxOQAAACBdlTBLJjO8LlO24fqXxqfFHJ95QcFpQ4hJWWXLUG1xIw
AAAEBH8OVWuHCPSFQjJ7oLvNqjZMpR1mQKwJkHZPqNkfJvp12VMEsmM7wuU7bh+pfGp8Uc
n3lBwWlDiElZZctQbXEjAAAAEXRlc3RAZXhhbXBsZS5sb2NhbAECAwQF
-----END OPENSSH PRIVATE KEY-----`;
    const seed = asEd25519Seed({ keyContent: testKeyContent });

    when('[t0] asAgeIdentityFromEd25519Seed is called', () => {
      then('it returns an AGE-SECRET-KEY- prefixed string', () => {
        const identity = asAgeIdentityFromEd25519Seed({ seed });
        expect(identity).toMatch(/^AGE-SECRET-KEY-1[A-Z0-9]+$/);
      });

      then('identity is deterministic for the same seed', () => {
        const identity1 = asAgeIdentityFromEd25519Seed({ seed });
        const identity2 = asAgeIdentityFromEd25519Seed({ seed });
        expect(identity1).toEqual(identity2);
      });
    });
  });
});
