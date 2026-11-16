import type { BoxPressure } from '../../../../../blackbox/.test/infra/getOneBoxPressureNow';

/**
 * .what = one width's measure: the peer beside a live suite, and the box while it ran
 * .note = `peerBesideMs` is null when no peer run finished while the suite was live
 */
export interface MeasureAtWidth {
  width: string;
  peerBesideMs: number | null;
  peerRunsBeside: number;
  peak: BoxPressure;
  suiteWallMs: number;
  suiteExitCode: number | null;
}
