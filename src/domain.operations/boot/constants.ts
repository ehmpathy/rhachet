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
 * .what = the prefix of a clone's spawn boot dir name: `serial=<serial>`, under `<actor>/boots/`
 * .why = one owner for the format, so the writer, the sweep, and the reap never disagree
 * .note = the dir sits beside the clone dir, never inside it: a clone dir is staged under a temp
 *         name and renamed after the spawn, while the brain cli keeps its boot paths for life
 */
export const BOOT_SPAWNED_DIR_PREFIX = 'serial=';

/**
 * .what = the three file names a clone's spawn boot dir holds
 * .why = the spawn boot layout has one owner, apart from the brain dir's door files
 * .note = `driftMd` is a vendor fact: the name the brain cli reads as memory from an
 *         `--add-dir`. it matches the brain dir's `CLAUDE.md` by coincidence of vendor, never
 *         by reference, so a rename of the door cannot rename the drift
 * .note = `metaJson` holds the spawn boot's hash and the current boot hash the drift was last
 *         written against, so a check is a hash compare, never a re-hash or a re-delta
 */
export const BOOT_SPAWNED_FILENAMES = {
  bootMd: 'boot.md',
  metaJson: 'boot.meta.json',
  driftMd: 'CLAUDE.md',
} as const;

/**
 * .what = the constant content of a brain dir's `AGENTS.md` — an import of `boot.md`
 */
export const BRAIN_DIR_AGENTS_MD_CONTENT = `@${BRAIN_DIR_BOOT_FILENAMES.bootMd}\n`;
