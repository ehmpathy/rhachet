import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { genAskpassShim } from './genAskpassShim';

/**
 * .what = prove the generated shim replaces the stock argv with the attributed
 *         message, then invokes the real dialog with it
 * .why  = the shim is the mechanism that turns a bare `Enter passphrase for …:`
 *         into an attributed, code-carrying prompt; a shim that forwarded the stock
 *         argv would defeat the whole confused-deputy defense
 *
 * .note = the "real dialog" here is a fake that records its argv[1] and echoes a
 *         canned passphrase — so the test proves the shim's argv rewrite AND that
 *         the dialog's stdout passes back through, with no gnome dependency
 */
describe('genAskpassShim', () => {
  given('[case1] a shim over a fake dialog that records its argv', () => {
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'keyrack-shim' });

      // a fake dialog: record argv[1] to a file, then echo a canned passphrase
      const seenPath = join(dir, 'seen-argv.txt');
      const fakeDialog = join(dir, 'fake-dialog.sh');
      writeFileSync(
        fakeDialog,
        [
          '#!/bin/sh',
          `printf '%s' "$1" > ${JSON.stringify(seenPath)}`,
          "echo 'hunter2'",
          '',
        ].join('\n'),
        { mode: 0o700 },
      );

      const message = [
        '🔐 keyrack unlock',
        '   owner: ehmpath',
        '   tree:  rhachet · vlad/keyrack-identity-unlock',
        '   code:  7Q2F',
      ].join('\n');

      const shimPath = genAskpassShim({
        dialog: fakeDialog,
        message,
        intoDir: dir,
      });
      return { seenPath, shimPath, message };
    });

    when('[t0] the shim is invoked with the stock prompt as argv[1]', () => {
      const result = useBeforeAll(async () => {
        const stdout = execFileSync(
          scene.shimPath,
          ['Enter passphrase for /home/vlad/.ssh/ehmpath:'],
          { encoding: 'utf8' },
        );
        const seen = readFileSync(scene.seenPath, 'utf8');
        return { stdout, seen };
      });

      then(
        'the real dialog received the attributed message, not the stock prompt',
        () => {
          expect(result.seen).toEqual(scene.message);
          expect(result.seen).not.toContain('Enter passphrase for');
        },
      );

      then('the dialog stdout (the passphrase) passes straight back', () => {
        expect(result.stdout.trim()).toEqual('hunter2');
      });
    });
  });
});
