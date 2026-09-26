import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { given, then, useBeforeAll, when } from 'test-fns';

import { genSampleSshKey } from '@/blackbox/.test/assets/genSampleSshKey';
import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { invokeRhachetCliBinary } from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { killKeyrackDaemonForTests } from '@/blackbox/.test/infra/killKeyrackDaemonForTests';

/**
 * .what = blackbox proof that the passphrase dialog is ATTRIBUTED — it names the
 *         unlock scope (owner/org/tree/env) and shows a visual-match code that also
 *         prints to the CLI — driven end to end through the compiled binary
 * .why  = the confused-deputy defense (rule.forbid.contextless-unlock-prompt): a bare
 *         `Enter passphrase for …:` lets a spoofed dialog harvest the passphrase at an
 *         expected-unlock moment. keyrack points SSH_ASKPASS at a shim that rewrites
 *         the stock prompt into the attributed message + code. this proves the shim
 *         is wired: the REAL dialog (KEYRACK_ASKPASS) receives the attributed message,
 *         NOT the stock prompt, and the code it receives matches the one the CLI printed
 *
 * .note = the "real dialog" here is a capture double — a REAL executable that writes
 *         its argv[1] (the prompt it was handed) to a file, then echoes the passphrase.
 *         keyrack wraps it in the shim, so the file captures what the shim passed. this
 *         is an OS-boundary double (a real executable), NOT a jest mock
 *         (rule.forbid.acceptance.mocks)
 */
describe('keyrack unlock prompt attribution (the confused-deputy defense)', () => {
  const PASSPHRASE = 'correct-horse-battery-staple';

  beforeAll(() => {
    killKeyrackDaemonForTests({ owner: 'robot' });
  });

  given('[case1] a passphrased ed25519 unlock through the attributed dialog', () => {
    const scene = useBeforeAll(async () => {
      const repo = await genTestTempRepo({
        fixture: 'with-vault-os-secure',
        suffix: 'unlock-attribution',
      });

      // a passphrase-PROTECTED ed25519 key, so unlock must derive K via the agent
      const keyDir = join(repo.path, 'custom-keys');
      mkdirSync(keyDir, { recursive: true });
      const prikeyPath = join(keyDir, 'passphrased_key');
      genSampleSshKey({ keyPath: prikeyPath, passphrase: PASSPHRASE });

      // a capture double: write the prompt (argv[1]) the shim hands it to a file,
      // then echo the passphrase for ssh-add to consume
      const promptLog = join(repo.path, 'dialog-prompt.txt');
      const dialogPath = join(repo.path, 'capture-askpass.sh');
      writeFileSync(
        dialogPath,
        [
          '#!/usr/bin/env bash',
          `printf '%s' "$1" > '${promptLog}'`,
          `printf '%s\\n' '${PASSPHRASE}'`,
          '',
        ].join('\n'),
        'utf8',
      );
      chmodSync(dialogPath, 0o755);

      const env = {
        HOME: repo.path,
        KEYRACK_ASKPASS: dialogPath,
      };

      // init seals the manifest (prompts once at the init choke point)
      await invokeRhachetCliBinary({
        args: ['keyrack', 'init', '--owner', 'robot', '--prikey', prikeyPath],
        cwd: repo.path,
        env,
      });

      // unlock re-derives K via the agent — this is the attributed prompt under test.
      // --env test is an always-shown scope word; no keys need exist for the manifest
      // decrypt (and thus the prompt + attribution) to fire
      const unlockResult = await invokeRhachetCliBinary({
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

      const dialogPrompt = existsSync(promptLog)
        ? readFileSync(promptLog, 'utf8')
        : '';

      return { repo, unlockResult, dialogPrompt };
    });

    when('[t0] unlock prompts via the attributed dialog', () => {
      then('the dialog received the attributed header, not the stock prompt', () => {
        expect(scene.dialogPrompt).toContain('🔐 keyrack unlock');
        expect(scene.dialogPrompt).not.toContain('Enter passphrase for');
      });

      then('the dialog names every always-shown scope word', () => {
        expect(scene.dialogPrompt).toContain('owner:  robot');
        expect(scene.dialogPrompt).toContain('org:');
        expect(scene.dialogPrompt).toContain('tree:');
        expect(scene.dialogPrompt).toContain('env:    test');
      });

      then('the dialog names the key the passphrase is for', () => {
        expect(scene.dialogPrompt).toContain('key:');
        expect(scene.dialogPrompt).toContain('passphrased_key');
      });

      then('the CLI printed a visual-match code to stderr', () => {
        expect(scene.unlockResult.stderr).toContain('unlock code:');
      });

      then('the code in the dialog MATCHES the code the CLI printed (anti-spoof)', () => {
        // the whole defense: a spoofed dialog cannot know a freshly-minted code, so
        // the CLI-printed code and the dialog-shown code must be the SAME value
        const asCode = (text: string): string | null =>
          text.match(/unlock code:\s*([A-Z0-9]+)/)?.[1] ?? null;
        const asDialogCode = (text: string): string | null =>
          text.match(/code:\s+([A-Z0-9]+)/)?.[1] ?? null;

        const cliCode = asCode(scene.unlockResult.stderr);
        const dialogCode = asDialogCode(scene.dialogPrompt);

        expect(cliCode).not.toBeNull();
        expect(dialogCode).not.toBeNull();
        expect(dialogCode).toEqual(cliCode);
      });
    });
  });
});
