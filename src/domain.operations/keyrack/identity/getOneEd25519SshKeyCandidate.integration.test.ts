import { given, then, useBeforeAll, when } from 'test-fns';

import { genSampleEphemeralSshKey } from '@src/.test/assets/genSampleEphemeralSshKey';
import { genSampleRsaKey } from '@src/.test/assets/genSampleRsaKey';

import { mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getOneEd25519SshKeyCandidate } from './getOneEd25519SshKeyCandidate';

/**
 * .what = clamp the r11-1 defect: the picker must look PAST a non-ed25519 owner
 *         key (tried FIRST in the shared precedence) to the ed25519 key further
 *         down, and it must return null when no ed25519 key is present
 * .why  = the hand-rolled migration/init loops grabbed the owner key even when it
 *         was rsa, failed the ed25519 check on THAT one candidate, and stopped —
 *         a silent, permanent migration stall. this test goes RED under that weak
 *         loop (it would return the rsa owner path or null) and GREEN under the
 *         multi-candidate ed25519 picker (rule.require.clamp-edge-cases)
 *
 * .note = HOME is overridden per scene so getAllSshKeyCandidatePaths resolves the
 *         crafted temp .ssh dir; the original HOME is restored after the suite
 */
const homeOriginal = process.env.HOME;
afterAll(() => {
  process.env.HOME = homeOriginal;
});

describe('getOneEd25519SshKeyCandidate', () => {
  given('an rsa owner key first, then an id_ed25519 key further down', () => {
    const scene = useBeforeAll(async () => {
      // a fresh HOME with its own .ssh dir
      const home = mkdtempSync(join(tmpdir(), 'kr-home-'));
      const sshDir = join(home, '.ssh');
      mkdirSync(sshDir, { recursive: true });

      // the owner key (tried FIRST) is an rsa key — the wrong type
      const { path: ownerRsaPath } = genSampleRsaKey({
        keyPath: join(sshDir, 'myowner'),
      });

      // a standard id_ed25519 key (tried LATER) — the ed25519 the picker must find
      genSampleEphemeralSshKey({ dir: sshDir, keyName: 'id_ed25519' });
      const standardEd25519Path = join(sshDir, 'id_ed25519');

      // point HOME at this crafted home, then run the picker
      process.env.HOME = home;
      const candidate = getOneEd25519SshKeyCandidate({ owner: 'myowner' });

      return { ownerRsaPath, standardEd25519Path, candidate };
    });

    when('the picker runs across the shared precedence', () => {
      then('it returns the ed25519 key, not the rsa owner key', () => {
        expect(scene.candidate).not.toEqual(null);
        expect(scene.candidate?.keyPath).toEqual(scene.standardEd25519Path);
        expect(scene.candidate?.keyPath).not.toEqual(scene.ownerRsaPath);
      });

      then('the returned pubkey path pairs with the ed25519 key', () => {
        expect(scene.candidate?.pubkeyPath).toEqual(
          `${scene.standardEd25519Path}.pub`,
        );
      });
    });
  });

  given('only a non-ed25519 (rsa) key is present', () => {
    const scene = useBeforeAll(async () => {
      const home = mkdtempSync(join(tmpdir(), 'kr-home-'));
      const sshDir = join(home, '.ssh');
      mkdirSync(sshDir, { recursive: true });

      // the sole key is rsa — no ed25519 anywhere in the precedence
      const { path: ownerRsaPath } = genSampleRsaKey({
        keyPath: join(sshDir, 'myowner'),
      });

      process.env.HOME = home;
      const candidate = getOneEd25519SshKeyCandidate({ owner: 'myowner' });

      return { candidate };
    });

    when('the picker runs and no ed25519 key fits', () => {
      then('it returns null (a skip, never the rsa key)', () => {
        expect(scene.candidate).toEqual(null);
      });
    });
  });
});
