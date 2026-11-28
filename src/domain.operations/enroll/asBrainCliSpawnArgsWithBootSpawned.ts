import { BRAIN_CLI_BOOT_FLAG } from './asBrainCliSpawnArgs';

/** the brain-cli flag that names a dir whose `CLAUDE.md` loads as memory */
export const BRAIN_CLI_BOOT_SPAWNED_DIR_FLAG = '--add-dir';

/**
 * .what = point a spawn argv at the clone's own spawn boot: `--add-dir <bootSpawnedDir>` just
 *         before the boot flag, and the boot flag's file swapped to that dir's `boot.md`
 * .why = the clone's drift rides `<bootSpawnedDir>/CLAUDE.md`; the brain cli loads it as memory
 *        (with `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD`, set by `asBrainCliSpawnEnv`) and
 *        re-reads it at compaction. the system prompt reads the spawn boot's `boot.md`, so the
 *        bytes the clone holds are exactly the bytes its drift is computed from, whatever
 *        render lands between the spawn boot write and the brain cli's read
 *
 * .note = the add-dir flag takes a variadic list, so it sits just before `BRAIN_CLI_BOOT_FLAG`:
 *         the next flag ends the list, and a positional prompt in the passthrough is never read
 *         as a second dir
 * .note = an argv with no boot flag carries no boot to drift from, so it is returned as is
 */
export const asBrainCliSpawnArgsWithBootSpawned = (input: {
  args: string[];
  bootSpawnedDir: string;
  bootSpawnedMdPath: string;
}): string[] => {
  // no boot in the argv → no spawn boot to point at
  const at = input.args.indexOf(BRAIN_CLI_BOOT_FLAG);
  if (at === -1) return input.args;

  return [
    ...input.args.slice(0, at),
    BRAIN_CLI_BOOT_SPAWNED_DIR_FLAG,
    input.bootSpawnedDir,
    BRAIN_CLI_BOOT_FLAG,
    input.bootSpawnedMdPath,
    ...input.args.slice(at + 2),
  ];
};
