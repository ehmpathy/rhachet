import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';

import type { ContextCli } from '@src/domain.objects/ContextCli';

import { existsSync, lstatSync, readdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { isPathWithinGitroot } from './isPathWithinGitroot';

/**
 * .what = unlinks a role from the .agent directory structure
 * .why = inverse of execRoleLink — enables `rhx init --roles -role` to
 *        unenroll a role by removal of its symlink tree
 *
 * .note = removes .agent/repo=$repo/role=$role and everything under it
 *   (symlinks + linked resource dirs). robust to broken symlinks via rmSync.
 * .note = if the parent repo=$repo/ has no other role=* entries after removal,
 *   the whole repo=$repo/ dir is removed too (no orphan empty repo dirs).
 * .note = idempotent — an absent target is a no-op ({ status: 'absent' }).
 * .note = native repo=.this roles cannot be removed (not package-linked).
 */
export const execRoleUnlink = (
  input: { repo: string; role: string },
  context: ContextCli,
): { status: 'removed' | 'absent' } => {
  // guard: native roles live under repo=.this and are not removable.
  // caller error (the user asked to remove a native role) → BadRequestError
  // (exit 2), so callers know a retry will not help — per exit-code semantics
  if (input.repo === '.this')
    throw new BadRequestError('native roles (repo=.this) cannot be removed', {
      repo: input.repo,
      role: input.role,
    });

  // compute the role dir and its parent repo dir
  const agentDir = resolve(context.cwd, '.agent');
  const repoDir = resolve(agentDir, `repo=${input.repo}`);
  const repoRoleDir = resolve(repoDir, `role=${input.role}`);

  // guard: never touch a path outside the repo (defense against traversal)
  if (!isPathWithinGitroot({ path: repoRoleDir }, context))
    throw new UnexpectedCodePathError(
      'refuse to unlink a path outside the git repo',
      { repoRoleDir, gitroot: context.gitroot },
    );

  // detect the role dir (lstatSync detects broken symlinks; existsSync does not)
  const hadRoleDir = (() => {
    try {
      lstatSync(repoRoleDir);
      return true;
    } catch (error: unknown) {
      // boundary cast: node fs errors are typed `unknown` in catch; narrow to
      // read the `.code` field (the documented as-cast exception for external apis)
      const code = (error as { code?: string })?.code;
      if (code === 'ENOENT') return false;
      throw error;
    }
  })();

  // absent target: no-op (idempotent removal)
  if (!hadRoleDir) return { status: 'absent' };

  // remove the role dir and all symlinks/dirs within (force handles broken links)
  rmSync(repoRoleDir, { recursive: true, force: true });

  // clean the parent repo dir if no other role=* entries remain
  if (existsSync(repoDir)) {
    const hasOtherRoles = readdirSync(repoDir).some((entry) =>
      entry.startsWith('role='),
    );
    if (!hasOtherRoles) rmSync(repoDir, { recursive: true, force: true });
  }

  return { status: 'removed' };
};
