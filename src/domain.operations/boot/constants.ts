/**
 * .what = the three boot file names every brain dir holds
 * .why = one source for the pointer files, the exclude list, the gitignore line, and
 *        the migration drops — so a rename cannot leave one reader behind
 */
export const BRAIN_DIR_BOOT_FILENAMES = {
  agentsMd: 'AGENTS.md',
  claudeMd: 'CLAUDE.md',
  bootMd: 'boot.md',
} as const;

/**
 * .what = the constant content of a brain dir's `AGENTS.md` — an import of `boot.md`
 */
export const BRAIN_DIR_AGENTS_MD_CONTENT = `@${BRAIN_DIR_BOOT_FILENAMES.bootMd}\n`;
