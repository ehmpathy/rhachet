import { ConstraintError } from 'helpful-errors';

import { realpathSync } from 'node:fs';
import { join } from 'node:path';
import { genTempDir } from 'test-fns';

/**
 * .what = the root of this repo — the one source every test-infra module derives it from
 * .why = genTempDir keys its temp root on the git repo at process.cwd(), and this run's
 *        teardown scans the root keyed on THIS repo. so the two must agree
 * .note = the physical path: `process.cwd()` is always physical, so a checkout reached via a
 *         symlink (macos `/var` → `/private/var`) must compare physical to physical
 */
export const TEST_REPO_ROOT = realpathSync(join(__dirname, '../../..'));

/**
 * .what = whether a cwd sits at or inside this repo's root
 * .why = genTempDir and getOneTempDirRoot key their temp root on the git repo at the cwd; this
 *        is the one check every caller that depends on that key shares, so no two can drift
 */
export const isCwdInsideRepoRoot = (input: { cwd: string }): boolean =>
  input.cwd === TEST_REPO_ROOT || input.cwd.startsWith(`${TEST_REPO_ROOT}/`);

/**
 * .what = allocates a test temp dir via genTempDir, and yields its physical path
 * .why =
 *   - genTempDir is the one allocator: it stamps each dir with this run's id, so
 *     the jest globalTeardown (test-fns/autoprune.teardown.jest) reclaims it —
 *     under a failure or a --scope too. no call site carries a teardown duty
 *   - the physical path (/tmp/test-fns/{repo}/.temp/...) has no repo above it, so
 *     a fixture is as isolated as the bare os.tmpdir() dirs it replaces; the
 *     in-repo symlink handle genTempDir returns would let an upward walk (for
 *     `.agent/`, `package.json`) reach this repo
 *
 * .note = it fails fast on a cwd outside this repo, rather than move the cwd itself: a
 *         cwd in another repo would key the dir to a root this run's teardown never
 *         scans — a dir that silently survives the run that made it. a process-wide
 *         chdir would fix that only by a mutation every other reader of the cwd sees
 * .note = the deref retires once test-fns exposes the physical path itself
 *         (ehmpathy/test-fns#65)
 */
export const genTempDirPhysical = (
  input: Parameters<typeof genTempDir>[0],
): string => {
  const cwd = process.cwd();
  if (!isCwdInsideRepoRoot({ cwd }))
    throw new ConstraintError(
      'a test temp dir was asked for from a cwd outside this repo',
      {
        cwd,
        repoRoot: TEST_REPO_ROOT,
        slug: input.slug,
        hint: 'allocate the dir before the chdir, or chdir back first — else its root is one this run never reclaims',
      },
    );
  return realpathSync(genTempDir(input));
};
