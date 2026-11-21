import { ConstraintError, MalfunctionError } from 'helpful-errors';

import { type ChildProcess, spawn, spawnSync } from 'node:child_process';
import { createWriteStream, mkdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { asPeakPressure } from '../../../../blackbox/.test/infra/asPeakPressure';
import {
  type BoxPressure,
  getOneBoxPressureNow,
} from '../../../../blackbox/.test/infra/getOneBoxPressureNow';
import { asMeasureArgs } from './measure.acceptance.share/asMeasureArgs';
import { asMeasureErrorRender } from './measure.acceptance.share/asMeasureErrorRender';
import { asMeasureRecordName } from './measure.acceptance.share/asMeasureRecordName';
import { asMeasureSuiteLogName } from './measure.acceptance.share/asMeasureSuiteLogName';
import { asMeasureTree } from './measure.acceptance.share/asMeasureTree';
import type { MeasureAtWidth } from './measure.acceptance.share/MeasureAtWidth';

/**
 * .what = measures what a peer on this box feels while a scoped acceptance run is live
 * .why = the suite's bound is the peer's slowdown over its own baseline, with load and cpu psi
 *   reported beside it. a measure a human can rerun is what turns a width guess into a number
 *
 * .note = the box is read through the suite's own reader (`getOneBoxPressureNow`), so the measure
 *   and the suite's starved note grade the box one way
 * .note = the record lands under `.log/role=any/skill=measure.acceptance.share/`, so a pr can
 *   cite the exact numbers
 */

/**
 * .what = the line the suite's globalSetup prints first, before jest forks its workers
 */
const SUITE_HEADER_MARK = 'ℹ acceptance width';

/**
 * .what = how long the suite may take to print its header, then to fork its workers after it
 */
const SUITE_HEADER_WAIT_MAX_MS = 120_000;
const SUITE_WORKERS_SETTLE_MS = 10_000;

/**
 * .what = the most one suite run, or one peer run, may take before the measure ends it
 */
const SUITE_WALL_MAX_MS = 30 * 60_000;
const PEER_WALL_MAX_MS = 10 * 60_000;

/**
 * .what = a live child's exit, as a promise, and whether it has exited yet
 */
const genChildExit = (input: {
  child: ChildProcess;
}): { exited: Promise<{ code: number | null }>; isLive: () => boolean } => {
  // .note = deliberate mutation — an exit latch, set by the child's own exit event
  let live = true;
  const exited = new Promise<{ code: number | null }>((settle, fail) => {
    input.child.on('error', fail);
    input.child.on('exit', (code) => {
      live = false;
      settle({ code });
    });
  });
  return { exited, isLive: () => live };
};

/**
 * .what = refuse a scope that matches no acceptance file, before any suite or peer runs
 * .why = jest exits at once on a scope that matches naught, before the run header prints; with no
 *   check the human would meet `the suite exited before its header`, a malfunction that blames the
 *   skill for a typo of theirs
 */
const assertScopeMatchesFiles = (input: { scope: string[] }): void => {
  const listed = spawnSync(
    'npx',
    ['jest', '-c', './jest.acceptance.config.ts', '--listTests', ...input.scope],
    { env: { ...process.env, LOCALLY: 'true' }, encoding: 'utf-8' },
  );
  const files = (listed.stdout ?? '').split('\n').filter((line) => line.trim().length > 0);
  if (files.length > 0) return;
  throw new ConstraintError('no acceptance file matched the scope', {
    scope: input.scope.join(' '),
    hint: "each --scope is a jest path regex, e.g. --scope 'blackbox/cli/acceptance\\.shares-the-box'",
  });
};

/**
 * .what = run the peer once and yield its wall time in ms
 * .note = async, so the event loop turns while the peer runs and the suite's exit is seen live
 */
const getOnePeerWallMs = async (input: { peer: string }): Promise<number> => {
  const startedAt = performance.now();
  const child = spawn('sh', ['-c', input.peer], { stdio: 'ignore' });
  const cap = setTimeout(() => child.kill('SIGKILL'), PEER_WALL_MAX_MS);
  const { code } = await genChildExit({ child }).exited.finally(() => clearTimeout(cap));
  if (code !== 0)
    throw new MalfunctionError('the peer command failed', {
      peer: input.peer,
      code,
      wallMaxMs: PEER_WALL_MAX_MS,
      hint: 'run the --peer command alone in a shell; it must exit 0 within the cap',
    });
  return performance.now() - startedAt;
};

/**
 * .what = the median of a list of numbers, or null for an empty list
 */
const asMedianOrNull = (input: { values: number[] }): number | null => {
  const sorted = [...input.values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? null;
};

/**
 * .what = start the scoped suite at one width, as a human would locally, with a hard wall cap
 * .note = both streams land in the suite log, read as they come so the pipes never fill; stderr is
 *   also watched for the header line
 */
const genSuiteRun = (input: {
  width: string;
  scope: string[];
  logPath: string;
}): {
  child: ChildProcess;
  exited: Promise<{ code: number | null }>;
  isLive: () => boolean;
  headed: Promise<void>;
} => {
  const child = spawn(
    'npx',
    ['jest', '-c', './jest.acceptance.config.ts', '--maxWorkers', input.width, '--forceExit', ...input.scope],
    { env: { ...process.env, LOCALLY: 'true' }, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  const log = createWriteStream(input.logPath);
  child.stdout?.on('data', (chunk: Buffer) => log.write(chunk));
  child.stderr?.on('data', (chunk: Buffer) => log.write(chunk));
  const cap = setTimeout(() => child.kill('SIGTERM'), SUITE_WALL_MAX_MS);
  const { exited: exitedRaw, isLive } = genChildExit({ child });

  // the exit settles only once the log holds every byte, so a red row's log is whole when read
  const exited = exitedRaw.then(
    async (result) => {
      await new Promise<void>((done) => log.end(done));
      return result;
    },
    async (error: unknown) => {
      await new Promise<void>((done) => log.end(done));
      throw error;
    },
  );
  void exited.finally(() => clearTimeout(cap)).catch(() => undefined);
  const headed = new Promise<void>((settle, fail) => {
    const wait = setTimeout(
      () =>
        fail(
          new MalfunctionError('the suite printed no header in time', {
            waitMs: SUITE_HEADER_WAIT_MAX_MS,
            hint: `run the scope alone: rhx test.acceptance.credfree --scope '${input.scope.join('|')}' --maxWorkers ${input.width}`,
          }),
        ),
      SUITE_HEADER_WAIT_MAX_MS,
    );
    child.stderr?.on('data', (chunk: Buffer) => {
      if (!chunk.toString().includes(SUITE_HEADER_MARK)) return;
      clearTimeout(wait);
      settle();
    });
    void exited.then(() => {
      clearTimeout(wait);
      fail(
        new MalfunctionError('the suite exited before its header', {
          width: input.width,
          hint: `check --widths; run the scope alone: rhx test.acceptance.credfree --scope '${input.scope.join('|')}' --maxWorkers ${input.width}`,
        }),
      );
    }, fail);
  });
  return { child, exited, isLive, headed };
};

/**
 * .what = sample the box's pressure each second until stopped
 */
const genPressureSampler = (): { stop: () => BoxPressure } => {
  // .note = deliberate mutation — the peak folds each sample in, bounded to this sampler
  let peak: BoxPressure | null = null;
  const sample = (): void => {
    peak = asPeakPressure({ now: getOneBoxPressureNow(), peak });
  };
  sample();
  const timer = setInterval(sample, 1000);
  return {
    stop: () => {
      clearInterval(timer);
      sample();
      return peak ?? getOneBoxPressureNow();
    },
  };
};

/**
 * .what = run the peer while the suite is live; a run the suite did not outlast is dropped
 */
const getAllPeerWallMsBeside = async (input: {
  peer: string;
  peerRuns: number;
  isSuiteLive: () => boolean;
}): Promise<number[]> => {
  // .note = deliberate mutation — peer runs go in sequence, so two never share the box
  const besides: number[] = [];
  for (let run = 0; run < input.peerRuns && input.isSuiteLive(); run += 1) {
    const wallMs = await getOnePeerWallMs({ peer: input.peer });
    if (input.isSuiteLive()) besides.push(wallMs);
  }
  return besides;
};

/**
 * .what = measure the peer beside one live acceptance run at one width
 * .note = the suite is ended on any fault before its own exit, so a failed measure leaves no run
 */
const getOneMeasureAtWidth = async (input: {
  width: string;
  scope: string[];
  peer: string;
  peerRuns: number;
  logPath: string;
}): Promise<MeasureAtWidth> => {
  // start the suite, and sample the box across its whole run
  const startedAt = performance.now();
  const sampler = genPressureSampler();
  const suite = genSuiteRun({ width: input.width, scope: input.scope, logPath: input.logPath });
  try {
    // let the suite print its header, then fork its workers, before the peer starts
    await suite.headed;
    await new Promise((wake) => setTimeout(wake, SUITE_WORKERS_SETTLE_MS));

    // the peer, beside the live suite
    const besides = await getAllPeerWallMsBeside({
      peer: input.peer,
      peerRuns: input.peerRuns,
      isSuiteLive: suite.isLive,
    });

    const { code } = await suite.exited;
    return {
      width: input.width,
      peerBesideMs: asMedianOrNull({ values: besides }),
      peerRunsBeside: besides.length,
      peak: sampler.stop(),
      suiteWallMs: performance.now() - startedAt,
      suiteExitCode: code,
      suiteLogPath: relative(process.cwd(), input.logPath),
    };
  } finally {
    if (suite.isLive()) suite.child.kill('SIGTERM');
    sampler.stop();
  }
};

/**
 * .what = writes one progress line to stdout
 * .why = a measure runs one full suite per width, minutes in all; a line per phase shows it is
 *   at work. stdout, not stderr: `rhx` holds a skill's stderr back until it fails, so a progress
 *   line on stderr would reach the human only after a success, which is too late to help
 */
const emitProgress = (input: { line: string }): void => {
  process.stdout.write(`${input.line}\n`);
};

/**
 * .what = measure the peer alone, then beside a live suite at each width, and record it
 */
const main = async (): Promise<void> => {
  const args = asMeasureArgs({ argv: process.argv.slice(2) });

  // a typo scope is the caller's to fix; refuse it before minutes of measure begin
  assertScopeMatchesFiles({ scope: args.scope });

  emitProgress({
    line: `🧮 measure.acceptance.share, at work (one full suite per width, so minutes, not seconds)`,
  });

  // one stamp names the record and each width's suite log, so they sort together
  const at = new Date();
  const recordDir = join(process.cwd(), '.log/role=any/skill=measure.acceptance.share');
  mkdirSync(recordDir, { recursive: true });

  // the baseline: the box as found, and the peer alone on it
  const baseline = getOneBoxPressureNow();
  emitProgress({
    line: `   ├─ the peer alone, ${args.peerRuns} run${args.peerRuns === 1 ? '' : 's'}`,
  });
  // .note = deliberate mutation — solo peer runs go in sequence, never two at once
  const solos: number[] = [];
  for (let run = 0; run < args.peerRuns; run += 1)
    solos.push(await getOnePeerWallMs({ peer: args.peer }));
  const peerSoloMs = asMedianOrNull({ values: solos }) ?? 0;

  // the peer beside a live run, at each width, one width at a time
  // .note = deliberate mutation — widths run in sequence, so two suites never share the box
  const rows: MeasureAtWidth[] = [];
  for (const width of args.widths) {
    emitProgress({ line: `   ├─ width ${width}, the suite and the peer at work` });
    const row = await getOneMeasureAtWidth({
      width,
      scope: args.scope,
      peer: args.peer,
      peerRuns: args.peerRuns,
      logPath: join(recordDir, asMeasureSuiteLogName({ at, width })),
    });
    emitProgress({
      line: `   ├─ width ${width}, done in ${Math.round(row.suiteWallMs / 1000)}s`,
    });
    rows.push(row);
  }
  emitProgress({ line: '   └─ measured' });
  emitProgress({ line: '' });

  // the record, for the pr to cite
  const recordPath = join(recordDir, asMeasureRecordName({ at }));
  writeFileSync(
    recordPath,
    JSON.stringify({ baseline, peerSoloMs, rows, scope: args.scope, peer: args.peer }, null, 2),
  );

  process.stdout.write(
    `${asMeasureTree({ baseline, peerSoloMs, peerSoloRuns: solos.length, rows, recordPath: relative(process.cwd(), recordPath) })}\n`,
  );
};

// run only as the skill's entry
if (require.main === module)
  void main().catch((error: unknown) => {
    const rendered = asMeasureErrorRender({ error });
    process.stderr.write(rendered.stderr);
    process.exit(rendered.exitCode);
  });
