import { join } from 'path';

/**
 * .what = the repo-relative directory the say debug stream lands in
 * .why = `.agent/.cache/` is already gitignored, so a diagnostic stream never enters a
 *   diff; the `repo=` / `skill=` coordinates match the `.agent/` address form every other
 *   artifact in this tree uses, so the path is computable from the skill name alone
 */
export const CLONE_SAY_DEBUG_DIR_REL = join(
  '.agent',
  '.cache',
  'repo=rhachet',
  'skill=clone-say',
);

/**
 * .what = the absolute path of the say debug log for one calendar day
 * .why = one file per DAY, not per dispatch: a failure is rare and a reader wants the
 *   sequence of them side by side (the measured case was three dispatches whose only
 *   difference was the needle). a per-dispatch file would scatter that comparison across
 *   three reads, and a single unbounded file would never rotate
 *
 * .note = PURE — the date is an INPUT, never `new Date()` here, so the path is clamped at
 *   the unit grain and a test needs no clock stub
 */
export const getCloneSayDebugLogPath = (input: {
  repoPath: string;
  at: Date;
}): string => {
  // the LOCAL calendar day, so the filename matches the day a human debugs on rather than
  // a utc day that rolls over mid-night for most of the hosts this runs on
  const year = input.at.getFullYear();
  const month = String(input.at.getMonth() + 1).padStart(2, '0');
  const day = String(input.at.getDate()).padStart(2, '0');
  return join(
    input.repoPath,
    CLONE_SAY_DEBUG_DIR_REL,
    `debug.${year}-${month}-${day}.log`,
  );
};
