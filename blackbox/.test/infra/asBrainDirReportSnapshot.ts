import { asBrainDirReportBlock } from './asBrainDirReportBlock';
import { asSnapshotSafe } from './invokeRhachetCliBinary';

/**
 * .what = the `🧠 brain dir` block, masked for a snapshot, with adjacent identical rows
 *   collapsed to one
 *
 * .why = a role's inits each back up settings.json under a per-second stamp, so the moved
 *   `.bak.json` rows number one when the backups share a second and two when they do not.
 *   the stamp mask renders both as one identical text, so the count is a race on the clock,
 *   never contract — collapse it, or the snapshot flakes
 *
 * .note = only a `.bak` row collapses. any other adjacent duplicate is a real render defect,
 *   and the snapshot must keep it visible
 */
export const asBrainDirReportSnapshot = (input: { stdout: string }): string =>
  getAllLinesWithoutAdjacentBakRepeats({
    lines: asSnapshotSafe(asBrainDirReportBlock(input)).split('\n'),
  }).join('\n');

/**
 * .what = the lines, with each `.bak` row that repeats the row above it dropped
 * .why = names the one collapse the snapshot applies, so no other duplicate is hidden
 */
const getAllLinesWithoutAdjacentBakRepeats = (input: {
  lines: string[];
}): string[] =>
  input.lines.filter(
    (line, index) =>
      !isBakRepeat({ line, lineAbove: input.lines[index - 1] ?? null }),
  );

/**
 * .what = whether a row is a moved settings backup identical to the row above it
 * .why = names the one row class whose count races the clock
 */
const isBakRepeat = (input: { line: string; lineAbove: string | null }): boolean =>
  /settings\.\$[A-Z]+\.bak\.json/.test(input.line) && input.line === input.lineAbove;
