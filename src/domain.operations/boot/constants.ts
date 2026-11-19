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
 * .what = the prefix of a boot revision dir name: `sha256=<hash>`
 * .why = one owner for the format, so the writer, the sweep, and the readout never disagree
 */
export const BOOT_REVISION_DIR_PREFIX = 'sha256=';

/**
 * .what = the two file names a boot revision dir holds
 * .why = the revision layout has one owner, apart from the brain dir's door files
 * .note = `driftMd` is a vendor fact: the name the brain cli reads as memory from an
 *         `--add-dir`. it matches the brain dir's `CLAUDE.md` by coincidence of vendor, never
 *         by reference, so a rename of the door cannot rename the drift
 */
export const BOOT_REVISION_FILENAMES = {
  bootMd: 'boot.md',
  driftMd: 'CLAUDE.md',
} as const;

/**
 * .what = the constant content of a brain dir's `AGENTS.md` — an import of `boot.md`
 */
export const BRAIN_DIR_AGENTS_MD_CONTENT = `@${BRAIN_DIR_BOOT_FILENAMES.bootMd}\n`;
