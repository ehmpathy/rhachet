import { given, then, useBeforeAll, when } from 'test-fns';

import { asSyntheticOpensshKeyPem } from '@src/.test/assets/asSyntheticOpensshKeyPem';
import { genSampleRsaKey } from '@src/.test/assets/genSampleRsaKey';

import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { asAgeIdentityResult } from './asAgeIdentityResult';

/**
 * .what = prove the richer twin of asAgeIdentityOrNull: it converts a convertible
 *         key, and for the ONE expected miss that carries an actionable fix (a
 *         passphrase-protected key with no `age` cli) it hands the fix back as a
 *         hint — instead of a bare null for every miss
 * .why  = an explicit --prikey the human named must not degrade to a generic "no
 *         identity" when the real cause is "install age" (errors-name-the-fix); the
 *         hint seam is what lets getContextKeyrack surface that specific message
 *
 * .note = integration (spawns ssh-keygen, touches a temp dir); self-isolated —
 *         own throwaway keys, never the host's real ~/.ssh. the age-absent case
 *         swaps PATH to a stub `which` that reports age as absent, so the hint is
 *         deterministic regardless of whether age is installed on this machine
 */
describe('asAgeIdentityResult', () => {
  const scene = useBeforeAll(async () => {
    const dir = mkdtempSync(join(tmpdir(), 'kr-asidr-'));

    // a passwordless ed25519 key — in-process convertible (no age needed)
    const ed25519Path = join(dir, 'id_ed25519');
    execFileSync(
      'ssh-keygen',
      ['-t', 'ed25519', '-f', ed25519Path, '-N', '', '-q'],
      { stdio: 'pipe', timeout: 30_000 },
    );

    // a passwordless rsa key — a valid key, but NOT ed25519 (an expected skip with
    // no actionable fix, so it must carry a null hint, not the install-age one)
    const { path: rsaPath } = genSampleRsaKey({ keyPath: join(dir, 'id_rsa') });

    // a passphrase-protected ed25519 key — the B1 gate routes this to the native
    // dialog (Variant A), NOT the age cli, so it is a bare skip (null, no hint):
    // age reads the passphrase from the tty (keylogger-exposed) and cannot open a
    // derive-not-store manifest anyway, so a passphrased ed25519 never offers the
    // install-age fix
    const passphrasedEd25519Path = join(dir, 'id_ed25519_locked');
    execFileSync(
      'ssh-keygen',
      [
        '-t',
        'ed25519',
        '-f',
        passphrasedEd25519Path,
        '-N',
        'test-passphrase',
        '-q',
      ],
      { stdio: 'pipe', timeout: 30_000 },
    );

    // a passphrase-protected rsa key — rsa cannot back the deterministic sign-as-KDF
    // derive (vision q4), so it keeps the age-cli fallback; with age absent this is
    // the ONE miss that carries the actionable install-age hint
    const passphrasedRsaPath = join(dir, 'id_rsa_locked');
    execFileSync(
      'ssh-keygen',
      [
        '-t',
        'rsa',
        '-b',
        '2048',
        '-f',
        passphrasedRsaPath,
        '-N',
        'test-passphrase',
        '-q',
      ],
      { stdio: 'pipe', timeout: 30_000 },
    );

    // a synthetic passphrased FIDO/sk- key — a real one needs a hardware token, but
    // the route reads ONLY the cleartext type token, so a synthetic openssh-key-v1
    // buffer with cipher=aes256-ctr + an sk- token drives the exact FIDO branch. FIDO
    // names an actionable fix (swap the key type), so it must carry a hint, NOT a bare
    // skip — the gap this case guards (r10 i041). the wire-format builder is the shared
    // src asset, so its shape lands once (rule.require.shared-test-fixtures)
    const fidoPath = join(dir, 'id_ed25519_sk');
    writeFileSync(
      fidoPath,
      asSyntheticOpensshKeyPem({
        cipher: 'aes256-ctr',
        keyType: 'sk-ssh-ed25519@openssh.com',
      }),
      { mode: 0o600 },
    );

    // a stub `which` that always reports its target as absent, so isAgeCliAvailable
    // reads age as not-on-PATH deterministically (exit 1 → a numeric status → the
    // allowlisted "command not found", not a genuine fault)
    const stubBin = join(dir, 'stubbin');
    execFileSync('mkdir', ['-p', stubBin], { stdio: 'pipe', timeout: 30_000 });
    const stubWhich = join(stubBin, 'which');
    writeFileSync(stubWhich, '#!/bin/sh\nexit 1\n', { mode: 0o755 });

    return {
      ed25519Path,
      rsaPath,
      passphrasedEd25519Path,
      passphrasedRsaPath,
      fidoPath,
      stubBin,
    };
  });

  given('[case1] a passwordless ed25519 key', () => {
    when('[t0] the transformer runs', () => {
      then('it returns the age identity', () => {
        const result = asAgeIdentityResult({ keyPath: scene.ed25519Path });
        expect(result.identity).toContain('AGE-SECRET-KEY-');
      });
    });
  });

  given('[case2] a non-ed25519 (rsa) key — an expected skip, no fix', () => {
    when('[t0] the transformer runs', () => {
      then('it returns a null identity with a null hint (bare skip)', () => {
        const result = asAgeIdentityResult({ keyPath: scene.rsaPath });
        expect(result.identity).toBeNull();
        expect('hint' in result && result.hint).toBeFalsy();
      });
    });
  });

  given(
    '[case3] a passphrase-protected rsa key with the age cli absent',
    () => {
      when('[t0] the transformer runs with a stubbed PATH', () => {
        then('it hands back the actionable install-age hint', () => {
          const pathBefore = process.env.PATH;
          process.env.PATH = scene.stubBin;
          try {
            const result = asAgeIdentityResult({
              keyPath: scene.passphrasedRsaPath,
            });
            expect(result.identity).toBeNull();
            // the specific, actionable fix must survive — not a swallowed null
            expect('hint' in result && result.hint).toContain('install age');
            expect('hint' in result && result.hint).toContain(
              'passphrase-protected',
            );
          } finally {
            process.env.PATH = pathBefore;
          }
        });
      });
    },
  );

  given(
    '[case4] a passphrase-protected ed25519 key — the Variant A route',
    () => {
      when('[t0] the transformer runs with a stubbed PATH (age absent)', () => {
        then(
          'it is a bare skip: null identity, null hint (no install-age fix)',
          () => {
            // B1's gate: a passphrased ed25519 key routes to the native dialog, so it
            // NEVER offers the install-age hint even with age absent — it drops out of
            // the prompt-free pool (null) so genContextKeyrack falls through to Variant A
            const pathBefore = process.env.PATH;
            process.env.PATH = scene.stubBin;
            try {
              const result = asAgeIdentityResult({
                keyPath: scene.passphrasedEd25519Path,
              });
              expect(result.identity).toBeNull();
              expect('hint' in result && result.hint).toBeFalsy();
            } finally {
              process.env.PATH = pathBefore;
            }
          },
        );
      });
    },
  );

  given(
    '[case5] a passphrase-protected FIDO/sk- key — an actionable swap',
    () => {
      when('[t0] the transformer runs', () => {
        then('it hands back the FIDO swap-key hint, not a bare skip', () => {
          // the fix (r10 i041): FIDO names an actionable fix (swap to an ed25519 or
          // passphrase-less key), so — like the install-age miss — it must ride back as a
          // hint an explicit --prikey can surface. before the fix it was dropped to null,
          // so a FIDO user who named their key got the generic "no identity" message
          const result = asAgeIdentityResult({ keyPath: scene.fidoPath });
          expect(result.identity).toBeNull();
          expect('hint' in result && result.hint).toContain('FIDO');
          expect('hint' in result && result.hint).toContain('ed25519');
          expect('hint' in result && result.hint).toContain('rhx keyrack init');
        });
      });
    },
  );
});
