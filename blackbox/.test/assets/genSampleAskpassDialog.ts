import { chmodSync, writeFileSync } from 'node:fs';

/**
 * .what = write a fake gnome-ssh-askpass dialog — a REAL executable that prints a
 *         passphrase to stdout and (optionally) appends one 'invoked' line to a log on
 *         each call — then chmod 755. returns the path.
 * .why = the passphrase-flows-through-the-dialog guarantee (vision q2) is proven by a
 *        REAL executable that the compiled cli's ssh-add / age invoke via SSH_ASKPASS —
 *        not a mock. this dialog-body shape recurred verbatim across the keyrack.passphrase
 *        acceptance cases; one named generator keeps the body in a single place so the
 *        'passphrase via the dialog, never the tty' guarantee cannot silently drift
 *        between copies (rule.require.shared-test-fixtures).
 * .note = one generator per tree — blackbox acceptance tests cannot import @src
 *         (rule.require.blackbox-via-selflink + hermetic-tests), so this is a byte-twin
 *         of src/.test/assets/genSampleAskpassDialog.ts. the sanctioned boundary split
 *         (same as genSampleSshKey / asSyntheticOpensshKeyPem).
 * .note = when logPath is given, each invocation appends one 'invoked' line, so a test
 *         can tally prompts by the log's 'invoked'-line count. the passphrase prints via
 *         printf '%s\\n' (a single line, exactly what ssh-add/age read).
 */
export const genSampleAskpassDialog = (input: {
  /** where to write the executable dialog */
  path: string;
  /** the passphrase the dialog prints to stdout */
  passphrase: string;
  /** optional log file — each invocation appends one 'invoked' line, for a prompt tally */
  logPath?: string;
}): { path: string } => {
  const body = [
    '#!/usr/bin/env bash',
    ...(input.logPath ? [`echo invoked >> '${input.logPath}'`] : []),
    `printf '%s\\n' '${input.passphrase}'`,
    '',
  ].join('\n');
  writeFileSync(input.path, body, 'utf8');
  chmodSync(input.path, 0o755);
  return { path: input.path };
};
