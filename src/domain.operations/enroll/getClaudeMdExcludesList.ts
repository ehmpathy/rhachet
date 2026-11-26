import { ACTOR_BRAIN_DIR_NAME } from '@src/domain.operations/actor/enrolled/constants';

import { join } from 'node:path';
import { BRAIN_DIR_BOOT_FILENAMES } from '../boot/constants';

/**
 * .what = the glob that excludes every `.claude/CLAUDE.md` but an actor's own door — the human's
 *         home `~/.claude/CLAUDE.md` above all, on any machine
 * .why = the repo actor's settings are committed, so the exclude must name no machine. claude
 *        matches each pattern with picomatch (`{ dot: true }`) against the absolute path and
 *        never expands `~` (measured, claude-code 2.1.308), so a home literal would leak a
 *        username into git and `~/…` would match naught. every actor door sits under a dir named
 *        `ACTOR_BRAIN_DIR_NAME`, so the negated extglob spares the doors and hits every home
 *
 * .note = picomatch's negated extglob is prefix-scoped, so a home whose name starts with `brain`
 *   (`/home/brain`, `/home/brainy`) is spared too — a known gap, pinned in the unit matrix,
 *   accepted for one common pattern (1.vision, fulcrum F1)
 */
export const CLAUDE_MD_EXCLUDE_HOME_GLOB = `**/!(${ACTOR_BRAIN_DIR_NAME})/.claude/${BRAIN_DIR_BOOT_FILENAMES.claudeMd}`;

/**
 * .what = the `claudeMdExcludes` an enrolled clone carries: each repo door in both
 *         spellings, every home `CLAUDE.md` by glob, every `CLAUDE.local.md` by glob, and both
 *         rules globs — in one fixed order
 * .why = one brain dir per clone: the cwd walk would otherwise load the repo's corpus
 *        beside the actor's (D5, D12). a `CLAUDE.md` exclude matches the symlink path
 *        and an `AGENTS.md` exclude the real path (M5), so both spellings are listed
 *
 * .note = the human's `CLAUDE.local.md` is excluded too, anywhere, by glob. a clone omits the
 *   `local` source that would load it, and the exclude holds should a future spawn restore
 *   that source — the human's personal notes never become a corpus beside the actor's.
 *   the repo `CLAUDE.md` needs no exclude: it rides the `project` source, which a clone omits
 * .note = both human-scoped entries are globs, never a path: the repo actor's
 *   `settings.of.repo.json` is tracked and must name no machine and no worktree
 *   (rule.forbid.machine-names-in-committed-config). the repo-door entries are absolute, and
 *   the repo actor's writer keeps only the non-absolute entries, so none reaches git
 * .note = the door names come from `BRAIN_DIR_BOOT_FILENAMES`, never a re-spelled
 *   literal: that constant is the one source the pointer writer also reads, so a rename
 *   there reaches this list. a literal here would let the writer emit the new name while
 *   this list still excluded the old one — which silently reopens D5/D12
 */
export const getClaudeMdExcludesList = (input: {
  repoPath: string;
  repoActorBrainDir: string;
}): string[] => {
  const repoBrainDir = join(input.repoPath, '.claude');
  return [
    join(repoBrainDir, BRAIN_DIR_BOOT_FILENAMES.agentsMd),
    join(repoBrainDir, BRAIN_DIR_BOOT_FILENAMES.claudeMd),
    join(input.repoActorBrainDir, BRAIN_DIR_BOOT_FILENAMES.agentsMd),
    join(input.repoActorBrainDir, BRAIN_DIR_BOOT_FILENAMES.claudeMd),
    CLAUDE_MD_EXCLUDE_HOME_GLOB,
    '**/CLAUDE.local.md',
    join(repoBrainDir, 'rules', '**'),
    join(input.repoActorBrainDir, 'rules', '**'),
  ];
};
