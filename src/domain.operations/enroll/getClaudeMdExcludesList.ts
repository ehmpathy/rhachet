import { join } from 'node:path';
import { BRAIN_DIR_BOOT_FILENAMES } from '../boot/constants';

/**
 * .what = the `claudeMdExcludes` an enrolled clone carries: each repo door in both
 *         spellings, the human's user `CLAUDE.md`, and both rules globs — absolute, in
 *         one fixed order
 * .why = one brain dir per clone: the cwd walk would otherwise load the repo's corpus
 *        beside the actor's (D5, D12). a `CLAUDE.md` exclude matches the symlink path
 *        and an `AGENTS.md` exclude the real path (M5), so both spellings are listed
 *
 * .note = the human's `CLAUDE.local.md` is excluded too, anywhere, by glob. a clone omits the
 *   `local` source that would load it, and the exclude holds should a future spawn restore
 *   that source — the human's personal notes never become a corpus beside the actor's.
 *   the repo `CLAUDE.md` needs no exclude: it rides the `project` source, which a clone omits
 * .note = `CLAUDE.local.md` is a glob, since the repo actor's `settings.of.repo.json` is tracked
 *   and must hold no per-worktree path (claude globs each pattern against absolute paths:
 *   https://code.claude.com/docs/en/memory). the home door is literal, since a glob for it also
 *   matches the clone's own door
 * .note = the door names come from `BRAIN_DIR_BOOT_FILENAMES`, never a re-spelled
 *   literal: that constant is the one source the pointer writer also reads, so a rename
 *   there reaches this list. a literal here would let the writer emit the new name while
 *   this list still excluded the old one — which silently reopens D5/D12
 */
export const getClaudeMdExcludesList = (input: {
  repoPath: string;
  repoActorBrainDir: string;
  home: string;
}): string[] => {
  const repoBrainDir = join(input.repoPath, '.claude');
  return [
    join(repoBrainDir, BRAIN_DIR_BOOT_FILENAMES.agentsMd),
    join(repoBrainDir, BRAIN_DIR_BOOT_FILENAMES.claudeMd),
    join(input.repoActorBrainDir, BRAIN_DIR_BOOT_FILENAMES.agentsMd),
    join(input.repoActorBrainDir, BRAIN_DIR_BOOT_FILENAMES.claudeMd),
    join(input.home, '.claude', BRAIN_DIR_BOOT_FILENAMES.claudeMd),
    '**/CLAUDE.local.md',
    join(repoBrainDir, 'rules', '**'),
    join(input.repoActorBrainDir, 'rules', '**'),
  ];
};
