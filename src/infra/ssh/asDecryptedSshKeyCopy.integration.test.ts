import { getError, given, then, useBeforeAll, when } from 'test-fns';

import { genSampleAskpassDialog } from '@src/.test/assets/genSampleAskpassDialog';
import { genSampleRsaKey } from '@src/.test/assets/genSampleRsaKey';

import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { asDecryptedSshKeyCopy } from './asDecryptedSshKeyCopy';
import { asSshKeyCipher } from './asSshKeyCipher';

/**
 * .what = prove the dialog-driven passphrase strip: a passphrased ssh key is copied and
 *         its passphrase removed via ssh-keygen -p, with the passphrase supplied by a
 *         scripted askpass (the gnome-dialog stand-in) — never the tty
 * .why  = this is the op that lets a passphrased rsa/ecdsa key decrypt via `age -d -i`
 *         WITHOUT age's garbled tty prompt (vision q2): age ignores SSH_ASKPASS, but
 *         ssh-keygen -p honors it, so keyrack strips first, then hands age the decrypted
 *         copy. clamps the op directly (rule.require.test-covered-repairs)
 *
 * .note = integration (spawns ssh-keygen, touches a temp dir); self-isolated — own
 *         throwaway key, never the host's ~/.ssh. the scripted askpass echoes the
 *         passphrase under SSH_ASKPASS_REQUIRE=force, exactly as the gnome dialog would
 */
describe('asDecryptedSshKeyCopy', () => {
  const scene = useBeforeAll(async () => {
    const dir = mkdtempSync(join(tmpdir(), 'kr-keystrip-'));
    const passphrase = 'strip-me-123';

    // a passphrase-PROTECTED rsa key (the non-ed25519 fallback population)
    const { path: keyPath } = genSampleRsaKey({
      keyPath: join(dir, 'id_rsa_locked'),
      passphrase,
    });

    // a scripted askpass that echoes the passphrase — the gnome-dialog stand-in
    const { path: askpass } = genSampleAskpassDialog({
      path: join(dir, 'gnome-ssh-askpass'),
      passphrase,
    });

    return { dir, passphrase, keyPath, askpass };
  });

  given('[case1] a passphrased rsa key + the scripted dialog', () => {
    when('[t0] the key is stripped via the dialog', () => {
      const result = useBeforeAll(async () => {
        const stripDir = mkdtempSync(join(tmpdir(), 'kr-keystrip-out-'));
        const copyPath = asDecryptedSshKeyCopy({
          keyPath: scene.keyPath,
          dialog: scene.askpass,
          intoDir: stripDir,
        });
        return { copyPath };
      });

      then('the copy is written into the target dir', () => {
        expect(result.copyPath).toContain('decrypted-key');
      });

      then('the copy is now passphrase-LESS (cipher none)', () => {
        const keyContent = readFileSync(result.copyPath, 'utf8');
        expect(asSshKeyCipher({ keyContent })).toEqual('none');
      });

      then('the original key is left UNCHANGED (still passphrased)', () => {
        const keyContent = readFileSync(scene.keyPath, 'utf8');
        expect(asSshKeyCipher({ keyContent })).not.toEqual('none');
      });
    });
  });

  given('[case2] a wrong passphrase from the dialog', () => {
    when(
      '[t0] the strip runs with a dialog that echoes the wrong passphrase',
      () => {
        then(
          'it fails loud (caller-fixable), never a silent bad copy',
          async () => {
            const { path: wrongAskpass } = genSampleAskpassDialog({
              path: join(scene.dir, 'wrong-askpass'),
              passphrase: 'wrong-passphrase',
            });
            const stripDir = mkdtempSync(join(tmpdir(), 'kr-keystrip-wrong-'));

            const error = await getError(
              (async () =>
                asDecryptedSshKeyCopy({
                  keyPath: scene.keyPath,
                  dialog: wrongAskpass,
                  intoDir: stripDir,
                }))(),
            );
            expect(error).toBeTruthy();
            expect(error.message).toContain(
              'ssh-keygen could not decrypt the key',
            );
          },
        );
      },
    );
  });
});
