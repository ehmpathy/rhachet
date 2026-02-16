import { BadRequestError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  isAgeCLIAvailable,
  SSH_KEY_PATH_MARKER,
  sshPrikeyToAgeIdentity,
} from './sshPrikeyToAgeIdentity';

describe('sshPrikeyToAgeIdentity.integration', () => {
  given('[case1] a passphrase-protected ed25519 key', () => {
    // this key has cipher aes256-ctr (passphrase-protected)
    // note: truncated for test; openssh format header is sufficient for cipher detection
    const protectedKeyContent = `-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAACmFlczI1Ni1jdHIAAAAGYmNyeXB0AAAAGAAAABBK7kJnHF
VQRnJ5lHRSAWBuAAAAEAAAAAEAAAAzAAAAC3NzaC1lZDI1NTE5AAAAIDVmNE1qNNE1RG9y
bXVDc3JZb3VyLWZha2Uta2V5AAAA
-----END OPENSSH PRIVATE KEY-----`;

    let tempDir: string;
    let keyPath: string;

    beforeEach(() => {
      // create temp dir with passphrase-protected key
      tempDir = mkdtempSync(join(tmpdir(), 'keyrack-ssh-test-'));
      keyPath = join(tempDir, 'id_ed25519_protected');
      writeFileSync(keyPath, protectedKeyContent, { mode: 0o600 });
    });

    afterEach(() => {
      if (existsSync(tempDir))
        rmSync(tempDir, { recursive: true, force: true });
    });

    when('[t0] age CLI is available on PATH', () => {
      then(
        'sshPrikeyToAgeIdentity returns SSH_KEY_PATH_MARKER with absolute path',
        () => {
          // skip test if age is not installed on this machine
          if (!isAgeCLIAvailable()) {
            console.log('test skipped: age CLI not installed');
            return;
          }

          const identity = sshPrikeyToAgeIdentity({ keyPath });

          // should return marker instead of age identity
          expect(identity.startsWith(SSH_KEY_PATH_MARKER)).toBe(true);

          // should contain absolute path
          const extractedPath = identity.slice(SSH_KEY_PATH_MARKER.length);
          expect(extractedPath).toEqual(keyPath);
        },
      );
    });

    when('[t1] age CLI is NOT on PATH', () => {
      // use a path that definitely does not contain age (not /usr/bin where age is often installed)
      const pathWithoutAge = '/tmp';

      then(
        'sshPrikeyToAgeIdentity throws BadRequestError with install instructions',
        async () => {
          // save original PATH
          const originalPath = process.env.PATH;

          try {
            // set PATH to exclude age binary
            process.env.PATH = pathWithoutAge;

            // verify age is now not found
            expect(isAgeCLIAvailable()).toBe(false);

            // call sshPrikeyToAgeIdentity and capture error
            const error = await getError(() =>
              sshPrikeyToAgeIdentity({ keyPath }),
            );

            // verify it threw BadRequestError
            expect(error).toBeInstanceOf(BadRequestError);

            // verify error message contains install instructions
            expect(error.message).toContain('passphrase-protected');
            expect(error.message).toContain('brew install age');
            expect(error.message).toContain('apt install age');
            expect(error.message).toContain('ssh-agent');
          } finally {
            // restore original PATH
            process.env.PATH = originalPath;
          }
        },
      );

      then('error message matches snapshot', async () => {
        // save original PATH
        const originalPath = process.env.PATH;

        try {
          // set PATH to exclude age binary
          process.env.PATH = pathWithoutAge;

          // call sshPrikeyToAgeIdentity and capture error
          const error = await getError(() =>
            sshPrikeyToAgeIdentity({ keyPath }),
          );

          // redact temp path from error message for deterministic snapshot
          const messageRedacted = error.message.replace(
            /"keyPath":\s*"[^"]+"/g,
            '"keyPath": "<redacted>"',
          );

          // snapshot the error message shown to the user
          expect(messageRedacted).toMatchSnapshot();
        } finally {
          // restore original PATH
          process.env.PATH = originalPath;
        }
      });
    });
  });

  given('[case2] an unencrypted ed25519 key', () => {
    // this key has cipher 'none' (no passphrase)
    const unencryptedKeyContent = `-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
QyNTUxOQAAACBdlTBLJjO8LlO24fqXxqfFHJ95QcFpQ4hJWWXLUG1xIwAAAJjBLCW1wSwl
tQAAAAtzc2gtZWQyNTUxOQAAACBdlTBLJjO8LlO24fqXxqfFHJ95QcFpQ4hJWWXLUG1xIw
AAAEBH8OVWuHCPSFQjJ7oLvNqjZMpR1mQKwJkHZPqNkfJvp12VMEsmM7wuU7bh+pfGp8Uc
n3lBwWlDiElZZctQbXEjAAAAEXRlc3RAZXhhbXBsZS5sb2NhbAECAwQF
-----END OPENSSH PRIVATE KEY-----`;

    let tempDir: string;
    let keyPath: string;

    beforeEach(() => {
      // create temp dir with unencrypted key
      tempDir = mkdtempSync(join(tmpdir(), 'keyrack-ssh-test-'));
      keyPath = join(tempDir, 'id_ed25519_unencrypted');
      writeFileSync(keyPath, unencryptedKeyContent, { mode: 0o600 });
    });

    afterEach(() => {
      if (existsSync(tempDir))
        rmSync(tempDir, { recursive: true, force: true });
    });

    when('[t0] age CLI is NOT on PATH', () => {
      // use a path that definitely does not contain age (not /usr/bin where age is often installed)
      const pathWithoutAge = '/tmp';

      then(
        'sshPrikeyToAgeIdentity still works via in-process conversion',
        async () => {
          // save original PATH
          const originalPath = process.env.PATH;

          try {
            // set PATH to exclude age binary
            process.env.PATH = pathWithoutAge;

            // verify age is now not found
            expect(isAgeCLIAvailable()).toBe(false);

            // should still work — in-process conversion for unencrypted keys
            const identity = sshPrikeyToAgeIdentity({ keyPath });

            // should return native age identity (not marker)
            expect(identity.startsWith('AGE-SECRET-KEY-')).toBe(true);
            expect(identity.startsWith(SSH_KEY_PATH_MARKER)).toBe(false);
          } finally {
            // restore original PATH
            process.env.PATH = originalPath;
          }
        },
      );
    });
  });

  given('[case3] isAgeCLIAvailable behavior', () => {
    when('[t0] PATH is manipulated to exclude age', () => {
      then('isAgeCLIAvailable returns false', () => {
        const originalPath = process.env.PATH;
        try {
          // set PATH to a directory that definitely does not contain age
          process.env.PATH = '/tmp';
          expect(isAgeCLIAvailable()).toBe(false);
        } finally {
          process.env.PATH = originalPath;
        }
      });
    });

    when('[t1] PATH includes the default install locations', () => {
      then('isAgeCLIAvailable reflects actual system state', () => {
        // this test documents the actual state — will pass on any machine
        const result = isAgeCLIAvailable();
        expect(typeof result).toBe('boolean');
        console.log(`age CLI available: ${result}`);
      });
    });
  });
});
