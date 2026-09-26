import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { asShellSingleQuoted } from './asShellSingleQuoted';

/**
 * .what = generate a keyrack-owned askpass shim that rewrites the stock passphrase
 *         prompt into an attributed message, then calls the real gnome dialog
 * .why  = the ssh tools (ssh-add, ssh-keygen -p) hand SSH_ASKPASS a bare
 *         `Enter passphrase for /path/to/key:` — a contextless prompt a spoof can
 *         mimic. keyrack points SSH_ASKPASS at this shim instead, so the human
 *         sees WHO/WHAT they authorize (owner/org/tree/env) plus a per-invocation
 *         visual-match code that proves the dialog belongs to THIS command
 *         (rule.forbid.contextless-unlock-prompt)
 *
 * .note = the attributed message lives in its own 0600 file; the shim reads it at
 *         call time, so a multi-line message never has to be embedded as shell
 *         syntax inside the shim itself
 * .note = both baked paths (the real dialog, the prompt file) are single-quoted so
 *         a space or a shell metacharacter in either can never be reinterpreted as
 *         syntax (asShellSingleQuoted)
 * .note = the shim + prompt are written INTO the caller's private 0700 temp dir, so
 *         the caller's own cleanup reaps them; they live only for the one invocation
 * .note = `exec` replaces the shim process with the real dialog, so the dialog's
 *         stdout (the passphrase) and its exit code pass straight back to the ssh
 *         tool — the shim adds attribution and leaves the passphrase path untouched
 */
export const genAskpassShim = (input: {
  dialog: string;
  message: string;
  intoDir: string;
}): string => {
  const promptPath = join(input.intoDir, 'askpass-prompt.txt');
  const shimPath = join(input.intoDir, 'askpass-shim.sh');

  // the attributed message in its own 0600 file — the shim cats it at call time,
  // so a multi-line prompt never needs shell quotes inside the shim body
  writeFileSync(promptPath, input.message, { mode: 0o600 });

  // the shim IGNORES the stock argv the ssh tool passes and calls the real dialog
  // with the attributed prompt instead. both baked paths are single-quoted so
  // neither can be reinterpreted as shell syntax
  const shim = [
    '#!/bin/sh',
    '# keyrack askpass shim — rewrites the stock passphrase prompt into the',
    '# attributed message (owner/org/tree/env/code), then calls the real dialog',
    `exec ${asShellSingleQuoted(input.dialog)} "$(cat ${asShellSingleQuoted(promptPath)})"`,
    '',
  ].join('\n');

  writeFileSync(shimPath, shim, { mode: 0o700 });
  return shimPath;
};
