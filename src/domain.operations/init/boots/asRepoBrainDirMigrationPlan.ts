import { BRAIN_DIR_BOOT_FILENAMES } from '@src/domain.operations/boot/constants';

const NAMES_DROPPED: string[] = Object.values(BRAIN_DIR_BOOT_FILENAMES);

/**
 * .what = the entry names of a real `<repo>/.claude` and of the default brain dir →
 *         which entries to drop, which to move, and which of those moves replace
 * .why = rhachet owns the boot context (S11), so the boot files are dropped, never moved.
 *        every other name MOVES — `<repo>/.claude` is the live dir a human and a role's init
 *        have just written, so where the default dir already holds that name, the repo-side
 *        copy is the current one and it wins. a name in both dirs is reported as an
 *        `overwrites` row, never refused
 */
export const asRepoBrainDirMigrationPlan = (input: {
  entriesInSrc: string[];
  entriesInDst: string[];
}): { drops: string[]; moves: string[]; overwrites: string[] } => {
  const drops = input.entriesInSrc.filter((name) =>
    NAMES_DROPPED.includes(name),
  );
  const moves = input.entriesInSrc.filter(
    (name) => !NAMES_DROPPED.includes(name),
  );
  const overwrites = moves.filter((name) => input.entriesInDst.includes(name));
  return { drops, moves, overwrites };
};
