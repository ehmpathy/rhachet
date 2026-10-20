import { join } from 'node:path';
import { BRAIN_DIR_BOOT_FILENAMES } from '../boot/constants';

/**
 * .what = the human's home `CLAUDE.md`, as portable globs: a home dir one segment below
 *         `home/` or `Users/`, `/root`, or `/github/home` (a github actions container HOME)
 * .why = the home `CLAUDE.md` is box-global; loaded into a repo's session, it makes two boxes
 *        behave differently on one commit (define.invariant.brain-config-grove-vs-repo, (6)).
 *        the repo actor's `settings.of.repo.json` is tracked, so the exclude must name no
 *        machine-local path
 *
 * .note = claude matches each pattern against absolute paths via picomatch and expands no `~`.
 *   a `*` never crosses a `/`, so these match a home door and never a repo door or a clone
 *   door, which sit deeper. a home outside `home/*`, `Users/*`, `/root` and `/github/home`
 *   (a custom `/srv/<user>`) is not covered
 */
export const CLAUDE_MD_EXCLUDES_HOME = [
  '**/home/*/.claude/CLAUDE.md',
  '**/Users/*/.claude/CLAUDE.md',
  '/root/.claude/CLAUDE.md',
  '/github/home/.claude/CLAUDE.md',
];

/**
 * .what = the `claudeMdExcludes` an enrolled clone carries: each repo door in both
 *         spellings, the human's home `CLAUDE.md`, and both rules globs, in one fixed order
 * .why = one brain dir per clone: the cwd walk would otherwise load the repo's corpus
 *        beside the actor's (D5, D12). a `CLAUDE.md` exclude matches the symlink path
 *        and an `AGENTS.md` exclude the real path (M5), so both spellings are listed
 *
 * .note = the human's `CLAUDE.local.md` is excluded too, anywhere, by glob: personal notes
 *   never become a corpus beside the actor's. the repo actor's settings also reach a plain
 *   `claude` via the local arrow, so both home excludes hold there too
 * .note = the door names come from `BRAIN_DIR_BOOT_FILENAMES`, never a re-spelled
 *   literal: that constant is the one source the pointer writer also reads, so a rename
 *   there reaches this list. a literal here would let the writer emit the new name while
 *   this list still excluded the old one — which silently reopens D5/D12
 */
export const getAllClaudeMdExcludes = (input: {
  repoPath: string;
  repoActorBrainDir: string;
}): string[] => {
  const repoBrainDir = join(input.repoPath, '.claude');
  return [
    join(repoBrainDir, BRAIN_DIR_BOOT_FILENAMES.agentsMd),
    join(repoBrainDir, BRAIN_DIR_BOOT_FILENAMES.claudeMd),
    join(input.repoActorBrainDir, BRAIN_DIR_BOOT_FILENAMES.agentsMd),
    join(input.repoActorBrainDir, BRAIN_DIR_BOOT_FILENAMES.claudeMd),
    ...CLAUDE_MD_EXCLUDES_HOME,
    '**/CLAUDE.local.md',
    join(repoBrainDir, 'rules', '**'),
    join(input.repoActorBrainDir, 'rules', '**'),
  ];
};
