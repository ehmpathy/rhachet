import { execFileSync } from 'node:child_process';

/**
 * .what = generate a sample ed25519 ssh keypair at a given path for blackbox tests
 * .why  = the same ssh-keygen invocation shape appears across several acceptance
 *         tests (keyrack.passphrase, keyrack.prikey); this is the shared fixture
 *         generator for the BLACKBOX tree (rule.require.shared-test-fixtures)
 *
 * .note = the src tree has its own twin, `src/.test/assets/genSampleEphemeralSshKey`
 *         (which also mints a temp dir + a stand-in askpass dialog). the blackbox
 *         tree cannot import @src, so the two generators are a cross-tree split
 *         imposed by that boundary, NOT accidental drift — each is the single home
 *         for its own tree
 * .note = execFileSync + argv (never a shell string) so the path/passphrase can
 *         never be interpreted as shell syntax — the no-shell convention this repo
 *         uses at every spawn site
 * .note = passphrase defaults to '' (a passwordless key); pass a value to protect it
 */
export const genSampleSshKey = (input: {
  keyPath: string;
  passphrase?: string;
}): { path: string } => {
  // 30s timeout bounds a hung ssh-keygen so it cannot block the suite forever —
  // the same timeout hygiene the prod spawn sites (getOneAgentSignature, etc.) use
  execFileSync(
    'ssh-keygen',
    ['-t', 'ed25519', '-f', input.keyPath, '-N', input.passphrase ?? '', '-q'],
    { timeout: 30_000 },
  );
  return { path: input.keyPath };
};
