import { statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/**
 * .what = the git repo root at or above a dir, by a walk for the `.git` marker — or null
 *         when no ancestor carries one
 * .why = a path boundary must be anchored at the REPO, never at the caller's cwd. a cwd-anchored
 *        bound refuses an in-repo path merely because the caller stood in a subdirectory, and
 *        names a boundary it never checked.
 *
 * 🔴 .note = SYNCHRONOUS on purpose. `getGitRepoRootOrNull` walks the same markers but returns
 *   a Promise, and the consumer here (`getOneBootSource`) is sync and reached from every arm
 *   that measures a boot payload: the two gates (`repo introspect`, `roles boot`) and the two
 *   `roles cost` report arms. to await there would ripple async through the whole boot-source
 *   chain to buy a fact a few `statSync` calls already hold.
 *
 * ⚠️ .note = the marker is tested for PRESENCE, never `.isDirectory()`. in a git WORKTREE —
 *   which is how this repo is checked out — `.git` is a FILE that points at the real git dir,
 *   so a directory test finds no root and silently falls back to the caller's cwd. that
 *   fallback is the exact defect this operation exists to fix.
 *
 * ⚠️ .note = the probe is `statSync(…, { throwIfNoEntry: false })`, never `existsSync`.
 *   `existsSync` reads EVERY fault as absence, so an unreadable or looped `.git` would be
 *   climbed past in silence. the option suppresses exactly `ENOENT` and `ENOTDIR` — the same
 *   closed absence set the async peer `getGitRepoRootOrNull` holds — and every other errno
 *   escapes (`define.statsync-and-lstatsync-suppress-different-errnos`, `rule.forbid.failhide`)
 *
 * .note = yields null rather than a throw for the no-repo case, so a caller outside a repo
 *   can fall back to its cwd (`rule.require.cli-tolerates-non-repo-cwd`).
 */
export const getOneGitRepoRootSync = (input: {
  from: string;
}): string | null => {
  // ⚠️ .note = DELIBERATE MUTATION — `dirWalked` climbs the ancestor chain
  //   1. each step is derived from the prior one, so the sequence is what the loop computes
  //   2. the scope is this function body, and the value escapes only as the return
  //   ⇒ the grant `rule.require.immutable-vars` requires, stated at the site
  let dirWalked = resolve(input.from);

  // climb until a `.git` marker is found, or until the filesystem root is reached
  //
  // .note = `dirname('/')` is `'/'`, so the root is its own parent — that fixed point is
  //   the loop's terminator, and it is why the guard compares against the NEXT dir
  for (;;) {
    const marker = statSync(resolve(dirWalked, '.git'), {
      throwIfNoEntry: false,
    });
    if (marker) return dirWalked;

    const dirParent = dirname(dirWalked);
    if (dirParent === dirWalked) return null;
    dirWalked = dirParent;
  }
};
