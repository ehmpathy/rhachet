import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { given, then, useBeforeAll, when } from 'test-fns';

import { genSampleAskpassDialog } from '@/blackbox/.test/assets/genSampleAskpassDialog';
import { genSampleSshKey } from '@/blackbox/.test/assets/genSampleSshKey';
import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';

/**
 * .what = blackbox proof of the SEAMLESS backcompat path through the built CLI: a v0
 *         manifest sealed to a RAW ssh-ed25519 recipient (the shape a pre-feature
 *         passphrased-ed25519 init left on disk) is UNLOCKED IN PLACE — decrypted via
 *         the ed25519 key (gnome-dialog strip + `age -d -i`), then fixed forward to the
 *         derive-not-store K seal — with NO re-init and NO credential loss
 * .why  = the whole point the wisher raised: a pre-feature user must NOT rebuild the
 *         host from scratch. before this path, unlock of that manifest hit the re-init
 *         ConstraintError. this walks the real compiled binary over the v0 shape and
 *         proves: first unlock decrypts + fixes forward (⛵ banner), second unlock is the
 *         plain single-prompt native dialog on the now-K-sealed manifest
 *
 * .note = the v0 manifest cannot be produced by the current CLI (init now derives K for
 *         a passphrased ed25519 key), so it is hand-sealed with the `age` binary to the
 *         key's raw ssh-ed25519 recipient — the exact pre-feature on-disk shape
 * .note = KEYRACK_ASKPASS points every prompt at a fake dialog that echoes the
 *         passphrase; ssh-keygen -p (the strip) AND ssh-add (the K re-derive) both honor
 *         SSH_ASKPASS, so the full two-prompt first unlock runs headlessly — an
 *         OS-boundary test double (a real executable), never a jest mock
 *         (rule.forbid.acceptance.mocks)
 */
describe('keyrack legacy raw-ssh manifest → seamless in-place fix-forward', () => {
  const PASSPHRASE = 'correct-horse-battery-staple';

  beforeAll(() => {
    killKeyrackDaemonForTests({ owner: 'robot' });
  });

  given('[case1] a v0 manifest sealed to a raw ssh-ed25519 recipient', () => {
    const scene = useBeforeAll(async () => {
      const repo = await genTestTempRepo({
        fixture: 'with-vault-os-secure',
        suffix: 'legacy-rawssh',
      });

      // a passphrase-PROTECTED ed25519 key (the pre-feature raw-ssh sealer)
      const keyDir = join(repo.path, 'custom-keys');
      mkdirSync(keyDir, { recursive: true });
      const prikeyPath = join(keyDir, 'passphrased_key');
      genSampleSshKey({ keyPath: prikeyPath, passphrase: PASSPHRASE });
      const pubkey = readFileSync(`${prikeyPath}.pub`, 'utf8').trim();

      // hand-build the v0 manifest plaintext: sealed to the RAW ssh recipient (mech
      // 'ssh'), the exact shape genKeyrackRecipientSealed's pre-feature branch wrote.
      // hosts empty — the fix-forward re-seal is driven by the recipient shape, not the
      // hosts (the os.secure blob re-key is proven at the domain grain)
      const manifestPlaintext = JSON.stringify({
        uri: 'keyrack.host.robot',
        owner: 'robot',
        recipients: [
          {
            mech: 'ssh',
            pubkey,
            label: 'default',
            addedAt: '2026-07-24T00:00:00Z',
          },
        ],
        hosts: {},
      });

      // seal it with the `age` binary to the key's raw ssh recipient (-> ssh-ed25519
      // stanza) — the v0 on-disk shape the current CLI can no longer produce
      const plaintextPath = join(repo.path, 'manifest.plaintext.json');
      writeFileSync(plaintextPath, manifestPlaintext, 'utf8');
      const manifestDir = join(repo.path, '.rhachet', 'keyrack');
      mkdirSync(manifestDir, { recursive: true });
      const manifestPath = join(manifestDir, 'keyrack.host.robot.age');
      execFileSync(
        'age',
        ['-e', '-a', '-R', `${prikeyPath}.pub`, '-o', manifestPath, plaintextPath],
        { stdio: 'pipe', timeout: 30_000 },
      );

      // the fake dialog echoes the passphrase; each invocation appends a line, so a
      // per-unlock prompt count can be asserted exactly (two on the fix-forward unlock,
      // one on the settled unlock)
      const askpassLog = join(repo.path, 'askpass.invoked.log');
      const { path: askpassPath } = genSampleAskpassDialog({
        path: join(repo.path, 'fake-askpass.sh'),
        passphrase: PASSPHRASE,
        logPath: askpassLog,
      });
      const env = { HOME: repo.path, KEYRACK_ASKPASS: askpassPath };
      const countPrompts = (): number =>
        existsSync(askpassLog)
          ? readFileSync(askpassLog, 'utf8')
              .split('\n')
              .filter((line) => line === 'invoked').length
          : 0;

      // FIRST unlock — decrypts the raw-ssh seal (strip prompt) + fixes forward to K
      // (re-derive prompt): the seamless in-place upgrade
      const promptsBeforeFirst = countPrompts();
      const unlockFirst = await invokeRhachetCliBinary({
        args: [
          'keyrack',
          'unlock',
          '--owner',
          'robot',
          '--prikey',
          prikeyPath,
          '--env',
          'test',
        ],
        cwd: repo.path,
        env,
      });
      const promptsFirst = countPrompts() - promptsBeforeFirst;

      // the manifest ciphertext AFTER the first unlock — used to prove the re-seal
      const manifestAfterFirst = readFileSync(manifestPath, 'utf8');

      // SECOND unlock — the manifest is now K-sealed, so this is the plain native path
      const promptsBeforeSecond = countPrompts();
      const unlockSecond = await invokeRhachetCliBinary({
        args: [
          'keyrack',
          'unlock',
          '--owner',
          'robot',
          '--prikey',
          prikeyPath,
          '--env',
          'test',
        ],
        cwd: repo.path,
        env,
      });
      const promptsSecond = countPrompts() - promptsBeforeSecond;

      return {
        repo,
        unlockFirst,
        unlockSecond,
        promptsFirst,
        promptsSecond,
        manifestAfterFirst,
      };
    });

    when('[t0] the legacy manifest is unlocked the FIRST time', () => {
      then('it succeeds — decrypted in place, NOT the re-init error', () => {
        expect(scene.unlockFirst.status).toEqual(0);
        expect(scene.unlockFirst.stdout).toContain('🔓 keyrack unlock');
        // the failure this whole path fixes: it must NOT tell the user to re-init
        const combined = scene.unlockFirst.stdout + scene.unlockFirst.stderr;
        expect(combined).not.toContain('re-init');
      });

      then('it announces the ⛵ upgrade (the seamless fix-forward fired)', () => {
        expect(scene.unlockFirst.stderr).toContain(
          '⛵ upgrade robot identity to the ssh-agent unlock',
        );
      });

      then(
        'it prompts TWICE — strip to decrypt the seal, then re-derive K',
        () => {
          expect(scene.promptsFirst).toEqual(2);
        },
      );
    });

    when('[t1] the manifest is re-sealed forward to K', () => {
      then('the on-disk ciphertext is no longer ssh-sealed (now X25519)', () => {
        // de-armor the age file and read its cleartext header: a v0 seal shows
        // `-> ssh-ed25519`, the fixed-forward K seal shows `-> X25519`. decode the armor
        // body (the base64 between the age armor markers) and inspect the header
        const armorBody = scene.manifestAfterFirst
          .split('\n')
          .filter((line) => !line.startsWith('-----'))
          .join('');
        const header = Buffer.from(armorBody, 'base64')
          .slice(0, 512)
          .toString('utf8');
        expect(header).toContain('-> X25519');
        expect(header).not.toContain('-> ssh-');
      });
    });

    when('[t2] the now-fixed-forward manifest is unlocked a SECOND time', () => {
      then('it succeeds on the plain native path', () => {
        expect(scene.unlockSecond.status).toEqual(0);
        expect(scene.unlockSecond.stdout).toContain('🔓 keyrack unlock');
      });

      then('it does NOT re-announce the ⛵ upgrade (already fixed forward)', () => {
        expect(scene.unlockSecond.stderr).not.toContain('⛵ upgrade');
      });

      then('it prompts exactly ONCE — the single native dialog', () => {
        expect(scene.promptsSecond).toEqual(1);
      });
    });
  });
});
