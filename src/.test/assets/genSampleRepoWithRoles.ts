import { genTempDir } from 'test-fns';

import { mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * .what = a git repo with synthetic roles under `.agent/`, each with a readme and one brief
 * .why = the boot and brain-dir suites all render from this one shape; one generator means a
 *   change to it (a new role file, a new layout) lands in every suite at once
 *   (rule.require.shared-test-fixtures)
 *
 * .note = each role's brief is `briefs/core.md` with the body `<role> brief body`, so a suite
 *   asserts a role reached a boot by that text alone
 * .note = the path is the realpath: the brain-dir writers canonicalize their `repoPath`, so a
 *   symlinked temp dir would otherwise part the path a test computes from the one written
 * .note = a native role (`repo=.this`) also gets a `boot.yml` that says its one brief, since
 *   a native role boots only once it declares one
 * .note = `gitignore`, when given, is written verbatim as the repo's `.gitignore` — a suite that
 *   asserts what git sees names the exact lines it rests on
 */
export const genSampleRepoWithRoles = (input: {
  slug: string;
  roles: { repo: string; role: string }[];
  gitignore?: string;
}): string => {
  const repoPath = realpathSync(genTempDir({ slug: input.slug, git: true }));
  for (const role of input.roles) {
    const roleDir = join(
      repoPath,
      '.agent',
      `repo=${role.repo}`,
      `role=${role.role}`,
    );
    mkdirSync(join(roleDir, 'briefs'), { recursive: true });
    writeFileSync(join(roleDir, 'readme.md'), `${role.role} readme`);
    writeFileSync(
      join(roleDir, 'briefs', 'core.md'),
      `${role.role} brief body`,
    );
    // a native role boots only once it declares a boot.yml; a linked one boots all it holds
    if (role.repo === '.this')
      writeFileSync(
        join(roleDir, 'boot.yml'),
        'briefs:\n  say:\n    - briefs/core.md\n',
      );
  }
  if (input.gitignore !== undefined)
    writeFileSync(join(repoPath, '.gitignore'), input.gitignore);
  return repoPath;
};
