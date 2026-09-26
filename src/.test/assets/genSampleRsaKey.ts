import { execFileSync } from 'node:child_process';

/**
 * .what = generate a sample rsa (2048-bit) ssh keypair at a given path for src tests
 * .why  = the same `ssh-keygen -t rsa -b 2048` invocation shape appears across several
 *         integration tests (the non-ed25519 fallback population: ageRecipientCrypto.
 *         sshFallback, asDecryptedSshKeyCopy, asAgeIdentityResult, asAgeIdentityOrNull,
 *         getOneEd25519SshKeyCandidate); this is the shared fixture generator for the SRC
 *         tree so a downstream change to the rsa keygen shape cannot silently drift between
 *         copies (rule.require.shared-test-fixtures)
 *
 * .note = the blackbox tree has its own twin, `blackbox/.test/assets/genSampleRsaKey`. the
 *         blackbox tree cannot import @src, so the two are a cross-tree split imposed by
 *         that boundary — the same sanctioned convention as genSampleSshKey /
 *         genSampleAskpassDialog, NOT accidental drift
 * .note = execFileSync + argv (never a shell string) so path/passphrase can never be read
 *         as shell syntax — the no-shell convention this repo uses at every spawn site
 * .note = stdio 'pipe' keeps ssh-keygen's banner off the test output; passphrase defaults
 *         to '' (a passwordless key); pass a value to protect it
 */
export const genSampleRsaKey = (input: {
  keyPath: string;
  passphrase?: string;
}): { path: string } => {
  // 30s timeout bounds a hung ssh-keygen so it cannot block the suite forever
  execFileSync(
    'ssh-keygen',
    ['-t', 'rsa', '-b', '2048', '-f', input.keyPath, '-N', input.passphrase ?? '', '-q'],
    { stdio: 'pipe', timeout: 30_000 },
  );
  return { path: input.keyPath };
};
