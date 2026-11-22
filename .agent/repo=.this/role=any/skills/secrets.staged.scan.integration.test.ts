import { execSync, spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { given, then, useBeforeAll, when } from 'test-fns';

import { asTestKeyText } from '@src/.test/assets/asTestKeyText';
import { genTempDirPhysical } from '@src/.test/infra/genTempDirPhysical';

/**
 * .what = the clamp on secrets.staged.scan: it lists EVERY staged key shape the husky secrets
 *         check would refuse, in one pass, and never echoes the key text
 * .why = the hook halts on its first hit, so without this a commit with N key-shaped files costs
 *        N refused commits. the scan must find all N, or it is no better than the hook
 *
 * .note = integration, never unit: it spawns the skill against a real git index, in a temp repo
 *         so this tree's index is never touched
 */

/** this file sits at `.agent/repo=.this/role=any/skills/`, so four hops reach the repo root */
const REPO_ROOT = join(__dirname, '..', '..', '..', '..');
const SKILL = join(__dirname, 'secrets.staged.scan.sh');

/** a throwaway key body, with a marker the scan must never echo */
const KEY_BODY_MARKER = 'SCANBITEMARKER0123456789abcdef';

/**
 * .what = a temp git repo with the real hook copied in, so the scan reads the same shapes
 */
const genScanRepo = (input: { slug: string }): string => {
  const dir = genTempDirPhysical({ slug: input.slug, git: true });
  mkdirSync(join(dir, '.husky'), { recursive: true });
  copyFileSync(join(REPO_ROOT, '.husky', 'check.secrets.sh'), join(dir, '.husky', 'check.secrets.sh'));
  return dir;
};

/**
 * .what = runs the skill with the given repo as cwd
 */
const runScan = (input: { cwd: string }): { status: number | null; stdout: string; stderr: string } => {
  const result = spawnSync('bash', [SKILL], { cwd: input.cwd, encoding: 'utf-8' });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
};

describe('secrets.staged.scan', () => {
  given('[case1] two staged files each hold a private key block', () => {
    when('[t0] the scan runs', () => {
      const result = useBeforeAll(async () => {
        const dir = genScanRepo({ slug: 'secrets-scan-hits' });
        const keyText = asTestKeyText({ kind: 'RSA', body: [KEY_BODY_MARKER] });
        writeFileSync(join(dir, 'a.txt'), `first line\n${keyText}\n`);
        writeFileSync(join(dir, 'b.txt'), `${keyText}\n`);
        execSync('git add a.txt b.txt', { cwd: dir, stdio: 'ignore' });
        return runScan({ cwd: dir });
      });

      then('it exits 2 and lists BOTH files, not just the first', () => {
        // the output rides in the object, so a red row shows what the scan said
        expect({
          status: result.status,
          hasA: result.stdout.includes('a.txt:2 [private key block]'),
          hasB: result.stdout.includes('b.txt:1 [private key block]'),
          stdout: result.stdout,
        }).toMatchObject({ status: 2, hasA: true, hasB: true });
      });

      then('it never echoes the key text', () => {
        expect(`${result.stdout}${result.stderr}`).not.toContain(KEY_BODY_MARKER);
      });
    });
  });

  given('[case2] the staged files hold no key shape', () => {
    when('[t0] the scan runs', () => {
      const result = useBeforeAll(async () => {
        const dir = genScanRepo({ slug: 'secrets-scan-clean' });
        writeFileSync(join(dir, 'clean.txt'), 'no secret here\n');
        execSync('git add clean.txt', { cwd: dir, stdio: 'ignore' });
        return runScan({ cwd: dir });
      });

      then('it exits 0 and says so', () => {
        expect({ status: result.status, stdout: result.stdout }).toMatchObject({
          status: 0,
          stdout: expect.stringContaining('no staged secret key shapes'),
        });
      });
    });
  });
});
