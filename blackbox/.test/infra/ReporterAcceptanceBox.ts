import { ConstraintError } from 'helpful-errors';

import { asFilesTimedOut } from './asFilesTimedOut';
import { asLeakReport } from './asLeakReport';
import { asLeftPartitioned } from './asLeftPartitioned';
import { asPeakPressure } from './asPeakPressure';
import { asReclaimNote } from './asReclaimNote';
import { asStarvedNote } from './asStarvedNote';
import {
  getAllProcessesWithEnvMark,
  type ProcessWithEnvMark,
} from './getAllProcessesWithEnvMark';
import { type BoxPressure, getOneBoxPressureNow } from './getOneBoxPressureNow';
import { getOneRunIdMintedHere } from './getOneRunIdMintedHere';
import { isBoxStarved } from './isBoxStarved';
import { isProcessReclaimedByRun } from './isProcessReclaimedByRun';

/**
 * .what = the window a process gets to finish its own exit before it counts as leaked
 * .why = a teardown that just sent a hangup may still be mid-exit when the last suite ends
 */
const LEAK_GRACE_MS = 3000;

/**
 * .what = a jest reporter that turns a leaked process into a red run, and names a starved box
 *   when a test times out on one
 * .why =
 *   - a reporter, never a globalTeardown throw: jest reads a reporter's error after the summary
 *     prints, and runs it after the workers end — a teardown throw would lose the summary
 *   - the run id marks this run's processes alone, so a peer suite on the same box is untouched
 *
 * .note = loaded through `ReporterAcceptanceBox.jest.cjs`, since jest loads a reporter with a bare
 *   require
 * .note = `getOneBoxPressureNow` is injectable through the reporter options, so a test can stand in
 *   a starved box; jest itself passes no such option, so a run reads the real box
 */
export class ReporterAcceptanceBox {
  // .note = deliberate mutation — a reporter is a stateful jest plugin: the peak and the error
  //   accumulate across the run, bounded to this instance
  private before: BoxPressure | null = null;
  private peak: BoxPressure | null = null;
  private sampler: NodeJS.Timeout | null = null;
  private error: Error | null = null;
  private readonly getPressureNow: () => BoxPressure;

  constructor(
    _globalConfig?: unknown,
    options?: { getOneBoxPressureNow?: () => BoxPressure } | null,
  ) {
    this.getPressureNow = options?.getOneBoxPressureNow ?? getOneBoxPressureNow;
  }

  onRunStart(): void {
    // read the box as the run begins, before its workers load it
    this.before = this.getPressureNow();

    // sample the box's pressure through the run, and keep the peak
    const sample = (): void => {
      this.peak = asPeakPressure({ now: this.getPressureNow(), peak: this.peak });
    };
    sample();
    this.sampler = setInterval(sample, 5000);
    this.sampler.unref();
  }

  async onRunComplete(
    _contexts: unknown,
    results: {
      testResults: Array<{
        testFilePath: string;
        failureMessage?: string | null;
      }>;
    },
  ): Promise<void> {
    if (this.sampler) clearInterval(this.sampler);

    // a starved red says so
    const filesTimedOut = asFilesTimedOut({
      testResults: results.testResults,
      repoRoot: process.cwd(),
    });
    if (
      filesTimedOut.length > 0 &&
      this.peak &&
      this.before &&
      isBoxStarved({ peak: this.peak })
    )
      process.stderr.write(
        `\n${asStarvedNote({ peak: this.peak, before: this.before, filesTimedOut })}`,
      );

    // sweep only by an id this process minted; an inherited id marks another run's processes
    const runId = getOneRunIdMintedHere({ env: process.env, pid: process.pid });
    if (!runId) return;

    // end every process the run left, so the box is left clean
    const left = await getAllLeftAfterGrace({ runId });
    if (left.length === 0) return;
    await setAllEnded({ runId, pids: left.map((proc) => proc.pid) });

    // a session daemon is the run's to reclaim; note the count
    const { reclaimed, leaked } = asLeftPartitioned({ left });
    if (reclaimed.length > 0)
      process.stderr.write(`\n${asReclaimNote({ reclaimed })}`);

    // any other process is a leak, and turns the run red
    if (leaked.length === 0) return;
    process.stderr.write(`\n${asLeakReport({ runId, leaked })}`);
    this.error = new ConstraintError('processes outlived this acceptance run', {
      runId,
      leaked,
      hint: 'end each in the afterAll of the test that spawned it, or spawn it via spawnRhachetCliBackground',
    });
  }

  getLastError(): Error | undefined {
    return this.error ?? undefined;
  }
}

/**
 * .what = this run's processes alive now
 */
const getAllOfRunNow = (input: { runId: string }): Promise<Array<ProcessWithEnvMark>> =>
  getAllProcessesWithEnvMark({
    envMark: `TEST_FNS_RUN=${input.runId}`,
    pidsExcluded: [process.pid],
  });

/**
 * .what = this run's processes still alive once the grace window has passed
 * .note = the poll waits on the would-be leaks alone; a session daemon never exits on its own
 *   within the window, so to wait on it would only spend the whole grace on every run
 */
const getAllLeftAfterGrace = async (input: {
  runId: string;
}): Promise<Array<ProcessWithEnvMark>> => {
  const deadline = Date.now() + LEAK_GRACE_MS;
  const hasLeak = (found: Array<{ command: string }>): boolean =>
    found.some((proc) => !isProcessReclaimedByRun(proc));
  // .note = deliberate mutation — a bounded poll, local to this read
  let found = await getAllOfRunNow(input);
  while (hasLeak(found) && Date.now() < deadline) {
    await new Promise((wake) => setTimeout(wake, 250));
    found = await getAllOfRunNow(input);
  }
  return found;
};

/**
 * .what = end each pid: a terminate, then a kill for any that outlives it
 * .note = the kill goes only to a pid that still carries this run's mark, so a pid the os
 *   recycled in the wait is never hit
 */
const setAllEnded = async (input: { runId: string; pids: number[] }): Promise<void> => {
  input.pids.forEach((pid) => sendOrSkip({ pid, signal: 'SIGTERM' }));
  await new Promise((wake) => setTimeout(wake, 1000));
  const pidsStillMarked = await getAllPidsStillMarked(input);
  pidsStillMarked.forEach((pid) => sendOrSkip({ pid, signal: 'SIGKILL' }));
};

/**
 * .what = of the given pids, those that still carry this run's mark now
 */
const getAllPidsStillMarked = async (input: {
  runId: string;
  pids: number[];
}): Promise<number[]> => {
  const pidsMarkedNow = new Set((await getAllOfRunNow(input)).map((proc) => proc.pid));
  return input.pids.filter((pid) => pidsMarkedNow.has(pid));
};

/**
 * .what = signal a pid; a pid already gone is the goal reached
 */
const sendOrSkip = (input: { pid: number; signal: NodeJS.Signals }): void => {
  try {
    process.kill(input.pid, input.signal);
  } catch (error) {
    if ((error as NodeJS.ErrnoException | null)?.code === 'ESRCH') return;
    throw error;
  }
};
