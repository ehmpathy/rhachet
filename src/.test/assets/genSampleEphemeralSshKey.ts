import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * .what = generate a real throwaway ed25519 ssh key (+ a stand-in askpass dialog)
 *         for the sign-as-KDF integration tests
 * .why  = the same triple — a temp dir, an ed25519 key via ssh-keygen, a touch'd
 *         gnome-ssh-askpass stand-in — was duplicated across 8 test files; this is
 *         the shared generator for the SRC tree (rule.require.shared-test-fixtures)
 *
 * .note = the blackbox tree has its own twin, `blackbox/.test/assets/genSampleSshKey`
 *         (a leaner variant: writes a key at a given path, no askpass stand-in). the
 *         blackbox tree cannot import @src, so the two generators are a cross-tree
 *         split imposed by that boundary, NOT accidental drift — each is the single
 *         home for its own tree
 * .note = a REAL key (not a mock), so it exercises the true crypto path; it is a
 *         sample fixture, hence genSample*, not genMock*
 * .note = pass `dir` to co-locate several keys in one home (the init tests need a
 *         passphrased + a passphrase-less key under the same HOME); omit it for the
 *         common case (one key in its own fresh 0700 temp dir)
 * .note = the dialog is a touch'd stand-in; a passphrase-less key never invokes it
 */
export const genSampleEphemeralSshKey = (input?: {
  dir?: string;
  keyName?: string;
  passphrase?: string;
  comment?: string;
}): { dir: string; keyPath: string; pubkeyPath: string; dialog: string } => {
  const dir = input?.dir ?? mkdtempSync(join(tmpdir(), 'kr-key-'));
  const keyPath = join(dir, input?.keyName ?? 'id_probe');

  execFileSync(
    'ssh-keygen',
    [
      '-t',
      'ed25519',
      '-N',
      input?.passphrase ?? '',
      '-f',
      keyPath,
      '-C',
      input?.comment ?? 'probe',
      '-q',
    ],
    { stdio: 'pipe', timeout: 30_000 },
  );

  // a touch'd stand-in dialog (shared across keys in the same dir)
  const dialog = join(dir, 'gnome-ssh-askpass');
  if (!existsSync(dialog))
    execFileSync('touch', [dialog], { stdio: 'pipe', timeout: 30_000 });

  return { dir, keyPath, pubkeyPath: `${keyPath}.pub`, dialog };
};
