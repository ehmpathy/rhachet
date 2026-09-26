import { BadRequestError, ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { asSyntheticOpensshKeyPem } from '@src/.test/assets/asSyntheticOpensshKeyPem';

import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SSH_KEY_PATH_MARKER } from './asSshKeyPathMarker';
import { isAgeCliAvailable } from './isAgeCliAvailable';
import { sshPrikeyToAgeIdentity } from './sshPrikeyToAgeIdentity';

// look up the real `which` binary path ONCE, before any PATH manipulation
// below. the probe runs `which age`, so a PATH that simulates "age not
// installed" must still hold a runnable `which` — an absent `which` is a
// genuine spawn fault the code rightly surfaces (rule.forbid.failhide), not
// "age absent"
const whichBinPath = execFileSync('which', ['which'], {
  encoding: 'utf8',
  timeout: 30_000,
}).trim();

/**
 * .what = a PATH dir that holds `which` but NOT `age`
 * .why = simulate "age not on PATH" without also hiding `which` itself, so the
 *        probe can run `which age`, have it exit non-zero, and report false —
 *        the actual "age absent" path, not a masked `which`-absent spawn fault
 */
const genBinDirWithoutAge = (): string => {
  const binDir = mkdtempSync(join(tmpdir(), 'keyrack-bin-noage-'));
  symlinkSync(whichBinPath, join(binDir, 'which'));
  return binDir;
};

// one shared bin dir with `which` but no `age`, for the PATH-manipulation cases
const binDirWithoutAge = genBinDirWithoutAge();

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

    // a passphrased ed25519 key must NEVER take the age-cli marker path — age reads
    // the passphrase from the tty (keylogger-exposed, the exact q2 promise this
    // feature keeps) and cannot open a derive-not-store X25519 manifest anyway. the
    // ed25519 gate fires BEFORE the age check, so the result is identical whether or
    // not age is installed: a throw that maps to null → Variant A's gnome dialog
    when('[t0] age CLI is available on PATH', () => {
      then('it throws (→ null → Variant A), never the tty-marker', () => {
        const error = getError(() => sshPrikeyToAgeIdentity({ keyPath }));

        // it is the allowlisted caller-condition (→ null in the discovery pool)
        expect(error).toBeInstanceOf(BadRequestError);
        // the message names the native dialog, NOT the tty
        expect(error.message).toContain('native dialog');
        expect(error.message).toContain('not the tty');
      });
    });

    when('[t1] age CLI is NOT on PATH', () => {
      // a PATH dir with `which` but no `age` (see genBinDirWithoutAge)
      const pathWithoutAge = binDirWithoutAge;

      then(
        'it STILL throws the native-dialog condition (the gate precedes the age check)',
        async () => {
          const originalPath = process.env.PATH;
          try {
            process.env.PATH = pathWithoutAge;
            expect(isAgeCliAvailable()).toBe(false);

            const error = await getError(() =>
              sshPrikeyToAgeIdentity({ keyPath }),
            );

            // the ed25519 gate fires first, so a passphrased ed25519 key never
            // reaches the "install age" branch — it always routes to Variant A
            expect(error).toBeInstanceOf(BadRequestError);
            expect(error.message).toContain('native dialog');
            expect(error.message).not.toContain('brew install age');
          } finally {
            process.env.PATH = originalPath;
          }
        },
      );

      then('the native-dialog message matches snapshot', async () => {
        const originalPath = process.env.PATH;
        try {
          process.env.PATH = pathWithoutAge;

          const error = await getError(() =>
            sshPrikeyToAgeIdentity({ keyPath }),
          );

          // redact temp path from error message for deterministic snapshot
          const messageRedacted = error.message.replace(
            /"keyPath":\s*"[^"]+"/g,
            '"keyPath": "<redacted>"',
          );
          expect(messageRedacted).toMatchSnapshot();
        } finally {
          process.env.PATH = originalPath;
        }
      });
    });
  });

  given('[case5] a passphrase-protected NON-ed25519 (rsa) key', () => {
    // rsa/ecdsa cannot back the deterministic sign-as-KDF derive (vision q4), so a
    // passphrased rsa key is NOT served by Variant A — it keeps the age-cli marker
    // fallback. this case proves the ed25519 gate did NOT swallow the non-ed25519
    // path: a real rsa key still routes to the marker (age present) or the
    // install-age error (age absent)
    let tempDir: string;
    let keyPath: string;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), 'keyrack-ssh-rsa-'));
      keyPath = join(tempDir, 'id_rsa_protected');
      // a real passphrased rsa key (execFileSync + argv, never a shell string)
      execFileSync(
        'ssh-keygen',
        [
          '-t',
          'rsa',
          '-b',
          '2048',
          '-f',
          keyPath,
          '-N',
          'test-passphrase',
          '-q',
        ],
        { timeout: 30_000 },
      );
    });

    afterEach(() => {
      if (existsSync(tempDir))
        rmSync(tempDir, { recursive: true, force: true });
    });

    when('[t0] age CLI is available on PATH', () => {
      then(
        'it returns the SSH_KEY_PATH marker (the rsa/ecdsa fallback)',
        () => {
          // the marker fallback needs age present; fail loud if absent, never a silent
          // skip (rule.forbid.failhide / rule.require.failfast)
          if (!isAgeCliAvailable())
            throw new ConstraintError(
              'age CLI required to verify the passphrased rsa fallback path',
              { hint: 'install age: `brew install age` or `apt install age`' },
            );

          const identity = sshPrikeyToAgeIdentity({ keyPath });
          expect(identity.startsWith(SSH_KEY_PATH_MARKER)).toBe(true);
          expect(identity.slice(SSH_KEY_PATH_MARKER.length)).toEqual(keyPath);
        },
      );
    });

    when('[t1] age CLI is NOT on PATH', () => {
      const pathWithoutAge = binDirWithoutAge;

      then(
        'it throws BadRequestError with the install-age instructions',
        async () => {
          const originalPath = process.env.PATH;
          try {
            process.env.PATH = pathWithoutAge;
            expect(isAgeCliAvailable()).toBe(false);

            const error = await getError(() =>
              sshPrikeyToAgeIdentity({ keyPath }),
            );
            expect(error).toBeInstanceOf(BadRequestError);
            expect(error.message).toContain('passphrase-protected');
            expect(error.message).toContain('brew install age');
            expect(error.message).toContain('apt install age');
          } finally {
            process.env.PATH = originalPath;
          }
        },
      );
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
      // a PATH dir with `which` but no `age` (see genBinDirWithoutAge)
      const pathWithoutAge = binDirWithoutAge;

      then(
        'sshPrikeyToAgeIdentity still works via in-process conversion',
        async () => {
          // save original PATH
          const originalPath = process.env.PATH;

          try {
            // set PATH to exclude age binary
            process.env.PATH = pathWithoutAge;

            // verify age is now not found
            expect(isAgeCliAvailable()).toBe(false);

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

  given(
    '[case4] the error-type contract the identity-pool skip relies on',
    () => {
      // asAgeIdentityOrNull (the shared pool-builder transformer) allowlists ONLY
      // BadRequestError — the EXPECTED caller-condition "this file is not a
      // convertible ed25519 openssh key" (malformed content, wrong key type,
      // passphrased-without-age). that lets opportunistic discovery skip a
      // non-key file at a speculative ~/.ssh path without a crash on unlock.
      // a GENUINE fault (an I/O error, a code bug) is NOT a BadRequestError, so it
      // surfaces loud rather than masquerade as "no identity" (rule.forbid.failhide)

      when('[t0] the key path does not exist (a genuine I/O fault)', () => {
        then(
          'it throws an error that is NOT a BadRequestError (must surface)',
          async () => {
            const error = await getError(() =>
              sshPrikeyToAgeIdentity({
                keyPath: '/nonexistent/keyrack/id_ed25519',
              }),
            );
            // a real I/O fault (ENOENT) must NOT be the allowlisted skip-condition,
            // so the pool builder rethrows it loud rather than swallow it
            expect(error).not.toBeInstanceOf(BadRequestError);
          },
        );
      });

      when('[t1] the content is not a valid openssh key', () => {
        const tempDir = mkdtempSync(join(tmpdir(), 'keyrack-ssh-test-'));
        const keyPath = join(tempDir, 'id_corrupt');
        writeFileSync(keyPath, 'not a valid key', { mode: 0o600 });

        then(
          'it throws a BadRequestError (a caller-condition the pool skips)',
          async () => {
            const error = await getError(() =>
              sshPrikeyToAgeIdentity({ keyPath }),
            );
            // a malformed key file is the caller's bad input, not a code fault, so
            // it is the allowlisted skip-condition — discovery tolerates a non-key
            // file at a standard path instead of a crash on the whole unlock
            expect(error).toBeInstanceOf(BadRequestError);
            rmSync(tempDir, { recursive: true, force: true });
          },
        );
      });
    },
  );

  given('[case3] isAgeCliAvailable behavior', () => {
    when('[t0] PATH is manipulated to exclude age', () => {
      then('isAgeCliAvailable returns false', () => {
        const originalPath = process.env.PATH;
        try {
          // set PATH to a dir with `which` but no `age`
          process.env.PATH = binDirWithoutAge;
          expect(isAgeCliAvailable()).toBe(false);
        } finally {
          process.env.PATH = originalPath;
        }
      });
    });

    when('[t1] PATH includes the default install locations', () => {
      then('isAgeCliAvailable returns a boolean, never throws', () => {
        // a smoke check on the real PATH: the probe reflects the ambient
        // environment without a throw. the DETERMINISTIC contract (PATH without
        // age → false) is pinned by [t0]; this only guards against a probe crash.
        // no console.log — a probe must not leak to the shared test stdout
        const result = isAgeCliAvailable();
        expect(typeof result).toBe('boolean');
      });
    });
  });

  given('[case6] a passphrase-protected FIDO/sk- key', () => {
    // a real FIDO key needs a hardware token to mint, so it is not hermetically
    // generatable in ci. but the route decision reads ONLY the cleartext
    // openssh-key-v1 header (cipher field + the type token in the first pubkey
    // blob), so a synthetic buffer with cipher=aes256-ctr + a `sk-ssh-ed25519@…`
    // type token drives the EXACT route branch a real FIDO key would hit — no
    // hardware, fully hermetic. the wire-format builder is the shared src asset,
    // so its shape lands once (rule.require.shared-test-fixtures)
    let tempDir: string;
    let keyPath: string;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), 'keyrack-ssh-fido-'));
      keyPath = join(tempDir, 'id_ed25519_sk');
      writeFileSync(
        keyPath,
        asSyntheticOpensshKeyPem({
          cipher: 'aes256-ctr',
          keyType: 'sk-ssh-ed25519@openssh.com',
        }),
        { mode: 0o600 },
      );
    });

    afterEach(() => {
      if (existsSync(tempDir))
        rmSync(tempDir, { recursive: true, force: true });
    });

    // a FIDO key can back none of the three paths, so it must route to a CLEAN
    // fallback message, never fall through to the marker/age path that would hang
    // on ssh-keygen -p of a hardware handle (vision: never a broken prompt)
    when('[t0] the FIDO key is the conversion candidate', () => {
      then(
        'it throws a caller-condition that names FIDO + a reachable fix',
        () => {
          const error = getError(() => sshPrikeyToAgeIdentity({ keyPath }));

          // the allowlisted caller-condition (→ null in the pool → drops cleanly)
          expect(error).toBeInstanceOf(BadRequestError);
          // names the FIDO limit, not a raw ssh-keygen/age failure
          expect(error.message).toContain('FIDO');
          // names a fix keyrack CAN actually serve (an ed25519 or passphrase-less key),
          // NOT the daemon cache — which only holds a grant AFTER a successful unlock, so a
          // FIDO-only user can never reach it (rule.require.errors-name-the-fix)
          expect(error.message).toContain('ed25519 key');
          expect(error.message).toContain('rhx keyrack init');
          expect(error.message).not.toContain('daemon-cache fallback');
          // it must NOT have taken the rsa/ecdsa marker/install-age branch
          expect(error.message).not.toContain('brew install age');
        },
      );
    });
  });
});
