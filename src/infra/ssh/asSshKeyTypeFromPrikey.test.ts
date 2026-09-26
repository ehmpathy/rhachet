import { BadRequestError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { asSshKeyTypeFromPrikey } from './asSshKeyTypeFromPrikey';

// a well-armored PEM whose base64 body decodes to bytes that do NOT start with the
// "openssh-key-v1\0" magic — passes asOpensshKeyBytes (header/footer present) but must
// be rejected by the magic-header validation, never silently misparsed
const NOT_AN_OPENSSH_BLOB = `-----BEGIN OPENSSH PRIVATE KEY-----
bm90LWFuLW9wZW5zc2gta2V5LWJsb2ItYXQtYWxsLXBhZGRpbmc=
-----END OPENSSH PRIVATE KEY-----`;

// a passphrase-protected ed25519 key — cipher aes256-ctr; its CLEARTEXT public
// section still carries the `ssh-ed25519` type token (the whole point: the type is
// knowable without the passphrase). the private half is a throwaway fake
const PROTECTED_ED25519 = `-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAACmFlczI1Ni1jdHIAAAAGYmNyeXB0AAAAGAAAABBK7kJnHF
VQRnJ5lHRSAWBuAAAAEAAAAAEAAAAzAAAAC3NzaC1lZDI1NTE5AAAAIDVmNE1qNNE1RG9y
bXVDc3JZb3VyLWZha2Uta2V5AAAA
-----END OPENSSH PRIVATE KEY-----`;

// an unencrypted ed25519 key — cipher none; same cleartext type token
const UNENCRYPTED_ED25519 = `-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACBdlTBLJjO8LlO24fqXxqfFHJ95QcFpQ4hJWWXLUG1xIwAAAJjBLCW1wSwl
tQAAAAtzc2gtZWQyNTUxOQAAACBdlTBLJjO8LlO24fqXxqfFHJ95QcFpQ4hJWWXLUG1xIw
AAAEBH8OVWuHCPSFQjJ7oLvNqjZMpR1mQKwJkHZPqNkfJvp12VMEsmM7wuU7bh+pfGp8Uc
n3lBwWlDiElZZctQbXEjAAAAEXRlc3RAZXhhbXBsZS5sb2NhbAECAwQF
-----END OPENSSH PRIVATE KEY-----`;

describe('asSshKeyTypeFromPrikey', () => {
  given('[case1] a passphrase-protected ed25519 key', () => {
    when('[t0] the type is read from the cleartext public section', () => {
      then('it returns ssh-ed25519 with no passphrase required', () => {
        expect(
          asSshKeyTypeFromPrikey({ keyContent: PROTECTED_ED25519 }),
        ).toEqual('ssh-ed25519');
      });
    });
  });

  given('[case2] an unencrypted ed25519 key', () => {
    when('[t0] the type is read', () => {
      then('it returns ssh-ed25519', () => {
        expect(
          asSshKeyTypeFromPrikey({ keyContent: UNENCRYPTED_ED25519 }),
        ).toEqual('ssh-ed25519');
      });
    });
  });

  // clamp (rule.require.clamp-edge-cases): a standalone caller that hands a non-openssh
  // buffer must get a clean BadRequestError from the magic-header check, never a silent
  // misparse from a blind offset skip. reproduces r11's silent-misparse-risk report
  given('[case3] a buffer that is not an openssh-key-v1 blob', () => {
    when('[t0] the type is read', () => {
      then('it throws a BadRequestError on the magic header', () => {
        const error = getError(() =>
          asSshKeyTypeFromPrikey({ keyContent: NOT_AN_OPENSSH_BLOB }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error?.message).toContain('unexpected magic header');
      });
    });
  });
});
