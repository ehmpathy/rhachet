import { asTreeBranchGlyphs } from '../../../../../blackbox/.test/infra/asTreeBranchGlyphs';
import type { BoxPressure } from '../../../../../blackbox/.test/infra/getOneBoxPressureNow';
import type { MeasureAtWidth } from './MeasureAtWidth';

/**
 * .what = the treestruct a human reads after a measure
 * .why = the peer's slowdown at each width, beside the peak the box reached, is the number a
 *   width decision rests on; a width where no peer run finished says so, never a made-up figure
 */
export const asMeasureTree = (input: {
  baseline: BoxPressure;
  peerSoloMs: number;
  peerSoloRuns: number;
  rows: MeasureAtWidth[];
  recordPath: string;
}): string => {
  const quiet =
    (input.baseline.cpuPsiSomeAvg10 ?? 0) < 10 &&
    input.baseline.load1 < input.baseline.cores / 2;
  return [
    '🧮 measure.acceptance.share',
    `   ├─ box = ${input.baseline.cores} cores, baseline load ${input.baseline.load1.toFixed(1)}, baseline cpu psi ${asPsiText({ psi: input.baseline.cpuPsiSomeAvg10 })}`,
    ...(quiet
      ? ['   ├─ quiet = yes']
      : [
          '   ├─ quiet = no (baseline psi ≥ 10% or load ≥ half the cores)',
          '   │  └─ numbers from a busy box are no measure of the bound; re-run on a quiet box',
        ]),
    `   ├─ peer solo = ${asSecondsText({ ms: input.peerSoloMs })} (median of ${input.peerSoloRuns})`,
    '   ├─ beside a live suite',
    ...input.rows.map((row, index) => {
      const glyphs = asTreeBranchGlyphs({ index, total: input.rows.length });
      return [
        `   │  ${glyphs.branch} width ${row.width}`,
        `   │  ${glyphs.stem}├─ ${asPeerBesideText({ row, peerSoloMs: input.peerSoloMs })}`,
        `   │  ${glyphs.stem}├─ peak load = ${row.peak.load1.toFixed(1)}, peak cpu psi = ${asPsiText({ psi: row.peak.cpuPsiSomeAvg10 })}`,
        `   │  ${glyphs.stem}└─ suite = ${(row.suiteWallMs / 1000).toFixed(0)}s, exit ${row.suiteExitCode}`,
      ].join('\n');
    }),
    '   │',
    `   └─ record = ${input.recordPath}`,
  ].join('\n');
};

/**
 * .what = the peer line of one width: its median and slowdown, or why there is none
 */
const asPeerBesideText = (input: { row: MeasureAtWidth; peerSoloMs: number }): string => {
  if (input.row.peerBesideMs === null)
    return 'peer = n/a, the suite ended before a peer run finished; widen --scope';
  const slowdown = ((input.row.peerBesideMs / input.peerSoloMs - 1) * 100).toFixed(0);
  return `peer = ${asSecondsText({ ms: input.row.peerBesideMs })} (median of ${input.row.peerRunsBeside}), slowdown ${slowdown}%`;
};

/**
 * .what = a psi percent, or n/a on a host with none
 */
const asPsiText = (input: { psi: number | null }): string =>
  input.psi === null ? 'n/a' : `${input.psi.toFixed(0)}%`;

/**
 * .what = milliseconds as seconds, two places
 */
const asSecondsText = (input: { ms: number }): string => `${(input.ms / 1000).toFixed(2)}s`;
