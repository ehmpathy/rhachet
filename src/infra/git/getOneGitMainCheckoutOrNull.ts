import { withAbsentAsNull } from '@src/infra/withAbsentAsNull';

import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * .what = the main checkout of a git repo root — itself for a standard repo, the main
 *   checkout for a worktree — or null when the root holds no `.git` it can read as either
 * .why = claude keys workspace trust by the MAIN checkout, not by a worktree's own path.
 *   measured 2026-09-27: a clone in a worktree whose `.claude.json` trusted only the
 *   worktree path dropped its allow rules as untrusted, and named the main checkout as
 *   the key it wanted; with that key added, the notice was gone
 *
 * .note = a worktree's `.git` is a FILE that holds `gitdir: <main>/.git/worktrees/<name>`,
 *   so the main checkout is read from that line, with no child process
 * .note = a `.git` file of another shape (a submodule's `gitdir: …/.git/modules/…`) yields
 *   null — no main checkout to name
 * .note = a `.git` that vanishes between the stat and the read yields null, as if absent
 */
export const getOneGitMainCheckoutOrNull = (input: {
  repoRoot: string;
}): string | null => {
  const marker = join(input.repoRoot, '.git');
  const stat = withAbsentAsNull({ read: () => statSync(marker) });

  // no marker → not a git root
  if (!stat) return null;

  // a `.git` dir → a standard repo, which is its own main checkout
  if (stat.isDirectory()) return input.repoRoot;

  // a `.git` file → a worktree; its gitdir names the main checkout
  const content = withAbsentAsNull({
    read: () => readFileSync(marker, 'utf8'),
  });
  if (content === null) return null;
  const gitdir = asGitdirFromMarkerOrNull({ content });
  if (!gitdir) return null;
  return asMainCheckoutFromGitdirOrNull({ gitdir });
};

/**
 * .what = the `gitdir:` path a `.git` marker file names, or null
 */
const asGitdirFromMarkerOrNull = (input: { content: string }): string | null =>
  input.content.match(/^gitdir:\s*(?<path>.+)$/m)?.groups?.path?.trim() || null;

/**
 * .what = the main checkout a worktree's gitdir sits under, or null for any other shape
 * .note = a worktree's gitdir is `<main>/.git/worktrees/<name>`
 */
const asMainCheckoutFromGitdirOrNull = (input: {
  gitdir: string;
}): string | null =>
  input.gitdir.match(/^(?<main>.+)\/\.git\/worktrees\/[^/]+$/)?.groups?.main ??
  null;
