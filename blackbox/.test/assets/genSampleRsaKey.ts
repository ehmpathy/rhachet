import { execFileSync } from 'node:child_process';

/**
 * .what = generate a sample rsa (2048-bit) ssh keypair at a given path for blackbox tests
 * .why  = the same `ssh-keygen -t rsa -b 2048` invocation shape appears across several
 *         acceptance cases (keyrack.passphrase case7/8/9 — the non-ed25519 fallback
 *         population); this is the shared fixture generator for the BLACKBOX tree so a
 *         downstream change to the rsa keygen shape (a -b bump, a -m format switch) cannot
 *         silently drift between copies (rule.require.shared-test-fixtures)
 *
 * .note = the src tree has its own twin, `src/.test/assets/genSampleRsaKey`. the blackbox
 *         tree cannot import @src (rule.require.blackbox-via-selflink + hermetic-tests), so
 *         the two are a cross-tree split imposed by that boundary — the same sanctioned
 *         convention as genSampleSshKey / genSampleAskpassDialog, NOT accidental drift
 * .note = execFileSync + argv (never a shell string) so path/passphrase can never be read
 *         as shell syntax — the no-shell convention this repo uses at every spawn site
 * .note = passphrase defaults to '' (a passwordless key); pass a value to protect it
 */
export const genSampleRsaKey = (input: {
  keyPath: string;
  passphrase?: string;
}): { path: string } => {
  // 30s timeout bounds a hung ssh-keygen so it cannot block the suite forever
  execFileSync(
    'ssh-keygen',
    ['-t', 'rsa', '-b', '2048', '-f', input.keyPath, '-N', input.passphrase ?? '', '-q'],
    { timeout: 30_000 },
  );
  return { path: input.keyPath };
};
