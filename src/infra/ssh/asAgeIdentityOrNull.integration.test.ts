import { BadRequestError, getError } from 'helpful-errors';
import { given, then, useBeforeAll, when } from 'test-fns';

import { genSampleRsaKey } from '@src/.test/assets/genSampleRsaKey';

import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { asAgeIdentityOrNull } from './asAgeIdentityOrNull';

/**
 * .what = prove the shared key->identity transformer converts a convertible key,
 *         returns null for an EXPECTED non-convertible key, and rethrows a genuine
 *         fault (never masks it as "not this key")
 * .why  = this transformer is the single seam every identity-pool builder shares;
 *         its allowlist boundary is the whole point (rule.forbid.failhide), so the
 *         boundary itself is what must be pinned
 *
 * .note = integration (spawns ssh-keygen, touches a temp dir); self-isolated —
 *         own throwaway keys, never the host's real ~/.ssh
 */
describe('asAgeIdentityOrNull', () => {
  const scene = useBeforeAll(async () => {
    const dir = mkdtempSync(join(tmpdir(), 'kr-asid-'));

    // a passwordless ed25519 key — in-process convertible
    const ed25519Path = join(dir, 'id_ed25519');
    execFileSync(
      'ssh-keygen',
      ['-t', 'ed25519', '-f', ed25519Path, '-N', '', '-q'],
      {
        stdio: 'pipe',
        timeout: 30_000,
      },
    );

    // a passwordless rsa key — a valid key, but NOT ed25519 (vision q4)
    const { path: rsaPath } = genSampleRsaKey({ keyPath: join(dir, 'id_rsa') });

    // a file that is not a key at all — an EXPECTED "not a convertible key" skip
    const garbagePath = join(dir, 'not-a-key.txt');
    writeFileSync(garbagePath, 'this is plainly not an openssh private key\n');

    // a directory where a key path is expected — a GENUINE I/O fault (EISDIR)
    const dirAsKeyPath = join(dir, 'a-directory');
    execFileSync('mkdir', [dirAsKeyPath], { stdio: 'pipe', timeout: 30_000 });

    return { ed25519Path, rsaPath, garbagePath, dirAsKeyPath };
  });

  given('[case1] a passwordless ed25519 key', () => {
    when('[t0] the transformer runs', () => {
      then('it returns an age identity', () => {
        const identity = asAgeIdentityOrNull({ keyPath: scene.ed25519Path });
        expect(identity).toContain('AGE-SECRET-KEY-');
      });
    });
  });

  given('[case2] a non-ed25519 (rsa) key — an EXPECTED skip', () => {
    when('[t0] the transformer runs', () => {
      then('it returns null (BadRequestError allowlisted, not a fault)', () => {
        const identity = asAgeIdentityOrNull({ keyPath: scene.rsaPath });
        expect(identity).toBeNull();
      });
    });
  });

  given('[case3] a file that is not a key — an EXPECTED skip', () => {
    when('[t0] the transformer runs', () => {
      then(
        'it returns null (malformed key is a caller-condition, not a fault)',
        () => {
          const identity = asAgeIdentityOrNull({ keyPath: scene.garbagePath });
          expect(identity).toBeNull();
        },
      );
    });
  });

  given(
    '[case4] a directory where a key path is expected — a GENUINE fault',
    () => {
      when('[t0] the transformer runs', () => {
        then(
          'it rethrows loud, never masks the I/O fault as null',
          async () => {
            const error = await getError(async () =>
              asAgeIdentityOrNull({ keyPath: scene.dirAsKeyPath }),
            );
            // a genuine I/O fault (EISDIR), NOT the allowlisted BadRequestError, and
            // never a silent null — so the fault surfaces (rule.forbid.failhide)
            expect(error).toBeTruthy();
            expect(error).not.toBeInstanceOf(BadRequestError);
            expect((error as Error).message).toMatch(/EISDIR|directory/i);
          },
        );
      });
    },
  );
});
