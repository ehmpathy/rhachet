import { BRAIN_DIR_BOOT_FILENAMES } from '../boot/constants';

/**
 * .what = the `claudeMdExcludes` an enrolled clone carries: every brain dir door in both
 *         spellings, every `CLAUDE.local.md`, and every rules dir — as globs, in one fixed order
 * .why = a clone reads its boot from the system prompt (`--system-prompt-file`) and its drift
 *        from its boot revision dir (`--add-dir`), so no brain dir door may load as memory: the
 *        cwd walk would load the repo's corpus beside the actor's (D5, D12), the human's
 *        `~/.claude/CLAUDE.md` would ride along, and the actor's own door
 *        (`CLAUDE.md → AGENTS.md → @boot.md`) would load the boot a second time. a `CLAUDE.md`
 *        exclude matches the symlink path and an `AGENTS.md` exclude the real path (M5), so
 *        both spellings are listed
 *
 * .note = globs, never absolute paths: the repo actor's `settings.of.repo.json` is tracked, so
 *   it must hold no per-worktree or per-home path (claude globs each pattern against absolute
 *   paths: https://code.claude.com/docs/en/memory). a glob over every door is safe now that the
 *   clone's own door is excluded too — no door of any brain dir is one a clone should read
 * .note = a boot revision dir (`<actor>/boots/sha256=<hash>/CLAUDE.md`) sits outside every
 *   `.claude` dir, so these globs never hide the drift
 * .note = the door names come from `BRAIN_DIR_BOOT_FILENAMES`, never a re-spelled literal:
 *   that constant is the one source the pointer writer also reads, so a rename there reaches
 *   this list. a literal here would let the writer emit the new name while this list still
 *   excluded the old one — which silently reopens D5/D12
 */
export const getClaudeMdExcludesList = (): string[] => [
  `**/.claude/${BRAIN_DIR_BOOT_FILENAMES.agentsMd}`,
  `**/.claude/${BRAIN_DIR_BOOT_FILENAMES.claudeMd}`,
  '**/CLAUDE.local.md',
  '**/.claude/rules/**',
];
