import { BRAIN_CLI_BOOT_FLAG } from './asBrainCliSpawnArgs';

/** the brain-cli flag that names a dir whose `CLAUDE.md` loads as memory */
export const BRAIN_CLI_BOOT_REVISION_DIR_FLAG = '--add-dir';

/**
 * .what = point a spawn argv at a boot revision: `--add-dir <revisionDir>` just before the boot
 *         flag, and the boot flag's file swapped to the revision's own `boot.md`
 * .why = the clone's drift rides `<revisionDir>/CLAUDE.md`; the brain cli loads it as memory
 *        (with `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD`, set by `asBrainCliSpawnEnv`) and
 *        re-reads it at compaction. the system prompt reads the revision's `boot.md`, so the
 *        bytes the clone holds are exactly the bytes its drift is computed from, whatever
 *        render lands between the revision findsert and the brain cli's read
 *
 * .note = the add-dir flag takes a variadic list, so it sits just before `BRAIN_CLI_BOOT_FLAG`:
 *         the next flag ends the list, and a positional prompt in the passthrough is never read
 *         as a second dir
 * .note = an argv with no boot flag carries no boot to drift from, so it is returned as is
 */
export const asBrainCliSpawnArgsWithBootRevision = (input: {
  args: string[];
  revisionDir: string;
  revisionBootMdPath: string;
}): string[] => {
  // no boot in the argv → no revision to point at
  const at = input.args.indexOf(BRAIN_CLI_BOOT_FLAG);
  if (at === -1) return input.args;

  return [
    ...input.args.slice(0, at),
    BRAIN_CLI_BOOT_REVISION_DIR_FLAG,
    input.revisionDir,
    BRAIN_CLI_BOOT_FLAG,
    input.revisionBootMdPath,
    ...input.args.slice(at + 2),
  ];
};
