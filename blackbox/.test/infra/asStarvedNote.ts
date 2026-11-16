import type { BoxPressure } from './getOneBoxPressureNow';

/**
 * .what = the note a starved red prints at the end of the run
 * .why = the red stays red; the note tells the reader the box, not the code, may be the cause —
 *   the pressure while the run was live beside the pressure before it began — and hands them the
 *   scoped re-run, through the same skill a run takes (a build check, `CI=true`, one worker), so
 *   the re-run differs from the first only in the box
 */
export const asStarvedNote = (input: {
  peak: BoxPressure;
  before: BoxPressure;
  filesTimedOut: string[];
}): string => {
  // each file as a jest path regex: its dots escaped, the files joined as alternatives
  const scope = input.filesTimedOut.map((file) => file.replace(/\./g, '\\.')).join('|');
  const psiLine =
    input.peak.cpuPsiSomeAvg10 === null || input.before.cpuPsiSomeAvg10 === null
      ? '   ├─ peak cpu pressure = not measurable on this host'
      : `   ├─ peak cpu pressure = ${input.peak.cpuPsiSomeAvg10.toFixed(0)}% (cpu stall, 10s average), ${input.before.cpuPsiSomeAvg10.toFixed(0)}% before the run began`;
  return [
    'ℹ a test timed out while the box was starved',
    psiLine,
    `   ├─ peak load = ${input.peak.load1.toFixed(1)} on ${input.peak.cores} cores, ${input.before.load1.toFixed(1)} before the run began`,
    '   ├─ the red stays red; a timeout under starvation may be the box, not the code',
    '   └─ re-run the timed-out files at one worker',
    `      └─ rhx test.acceptance.credfree --scope '${scope}' --maxWorkers 1`,
    '',
  ].join('\n');
};
