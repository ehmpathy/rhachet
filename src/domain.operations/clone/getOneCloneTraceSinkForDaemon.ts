import { appendFileSync, mkdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { getCloneTraceLogPath } from './getCloneTraceLogPath';
import { isCloneTraceHostFault } from './isCloneTraceHostFault';
import { writeCloneTraceLine } from './writeCloneTraceLine';

/**
 * .what = the dir a daemon's trace lines fall back to when its repo trace log cannot be written
 * .why = a per-user dir under the os tmpdir, so two users on one host never contend for one
 *   dir that the first of them created
 */
export const CLONE_TRACE_FALLBACK_DIR = join(
  tmpdir(),
  `rhachet.uid=${process.getuid?.() ?? 'none'}`,
  'clone-trace',
);

/**
 * .what = the clone DAEMON's trace sink — every line goes to the durable per-day trace log, and
 *   NEVER to the daemon's stdout or stderr
 * .why =
 *   - 🔴 an attended daemon runs in the process that mirrors the brain-cli into the human's pane,
 *     so its stderr IS that pane's tty. a trace line written there paints over the brain-cli's
 *     screen — onto its input row, where a human or a pane scrape reads it as typed input and can
 *     relay it to the clone as a prompt. a diagnostic must never reach a clone that way
 *   - a detached daemon's stderr is a pipe no one reads after handoff, so the log is the only
 *     channel with a reader there too. one rule serves both host modes
 *
 * .note = when the repo log cannot be written (any os call fault, `isCloneTraceHostFault`), the
 *   line goes to a per-day log under `fallbackDir`; if that faults too, the line is dropped and
 *   counted. the next line the repo log takes is preceded by one line that names the gap — how
 *   many lines, the cause, where they went — so a silent stretch in the repo log names itself
 *   where its reader already looks (`rule.forbid.failhide`), with no byte to the pane
 * .note = a code defect (an error with no os `syscall` behind it) is thrown up loud; no errno a
 *   host may return can kill the clone through this sink
 * .note = the day is read PER LINE: a daemon routinely lives past midnight
 * .note = each line is stamped with its time, the daemon's pid, and the clone's address, so a
 *   reader can place a stall against a wedge and name the clone whose lines share one repo log
 * .note = the writes are sync, on purpose: a line the daemon traced is on disk before the next
 *   line runs, so a crash keeps its last lines. the cost is that a hung mount holds the loop for
 *   that write; the lines are rare (a fault, a stall, one liveness line), so the trade holds
 * .note = a fallback line also names its repo and why the repo log refused it: the fallback dir is
 *   per user, shared by every repo's daemons, and may be the only log a reader ever finds
 * .note = a repo root removed under a live daemon (a worktree removed) is a fault, never a write:
 *   a trace line must not recreate the tree, which would block a later `git worktree add`
 */
export const getOneCloneTraceSinkForDaemon = (input: {
  repoPath: string;
  fallbackDir: string;
  /**
   * .what = the clone's address (`@:<short serial>`) the stamp names, or null where a daemon part
   *   is built with no clone in hand
   * .why = one repo log holds every clone's lines; the address is what a supervisor passes to
   *   `rhx clone get`, and it outlives the pid
   */
  clone: string | null;
}): ((line: string) => void) => {
  // .note = deliberate mutation — the gap since the repo log last took a write; local to this
  //   closure, reset once the gap is named
  let gap: CloneTraceGap | null = null;

  /**
   * .what = append one stamped line to the repo log, named gap first; the os fault code, or null
   * .why = the gap closes once its line lands, so a fault on the line after opens a fresh gap
   *   rather than recount one already named
   */
  const tryRepoLog = (attempt: {
    at: Date;
    stamp: string;
    line: string;
  }): string | null => {
    try {
      // a removed repo root faults here (`ENOENT`, a host fault) before a write can recreate it
      statSync(input.repoPath);
      if (gap) {
        writeCloneTraceLine({
          repoPath: input.repoPath,
          at: attempt.at,
          line: `${attempt.stamp} ${asCloneTraceGapLine({ gap })}`,
        });
        gap = null;
      }
      writeCloneTraceLine({
        repoPath: input.repoPath,
        at: attempt.at,
        line: `${attempt.stamp} ${attempt.line}`,
      });
      return null;
    } catch (error) {
      if (!isCloneTraceHostFault({ error })) throw error;
      return asErrorCode({ error });
    }
  };

  return (line: string): void => {
    const at = new Date();
    const stamp = asCloneTraceStamp({ at, clone: input.clone });

    // try the repo log first
    const repoCause = tryRepoLog({ at, stamp, line });
    if (repoCause === null) return;
    gap = asTraceGapWithRepoFault({ gap, cause: repoCause });

    // the repo log refused; try the fallback log, under the same day filename
    const fallbackPath = asCloneTraceFallbackPath({
      fallbackDir: input.fallbackDir,
      repoPath: input.repoPath,
      at,
    });
    try {
      // owner-only: the fallback sits under the shared os tmpdir
      mkdirSync(input.fallbackDir, { recursive: true, mode: 0o700 });
      appendFileSync(
        fallbackPath,
        `${stamp} repo=${input.repoPath} cause=${repoCause} ${line}`,
        'utf8',
      );
      gap = asTraceGapWithFallback({ gap, fallbackPath });
    } catch (error) {
      if (!isCloneTraceHostFault({ error })) throw error;
      gap = asTraceGapWithLoss({ gap, cause: asErrorCode({ error }) });
    }
  };
};

/**
 * .what = the head every daemon trace line carries: its time, the daemon's pid, and the clone's
 *   address when known
 * .why = a stall line is read to match a wedge in time, and to name the clone it stalled
 */
const asCloneTraceStamp = (input: { at: Date; clone: string | null }): string =>
  [
    input.at.toISOString(),
    `pid=${process.pid}`,
    ...(input.clone ? [`clone=${input.clone}`] : []),
  ].join(' ');

/**
 * .what = the record of a stretch of lines the repo trace log refused
 * .why = held until the repo log takes a write again, then named there in one line
 */
type CloneTraceGap = {
  count: number;
  cause: string;
  fallbackPath: string | null;
  lost: number;
  lostCause: string | null;
};

/**
 * .what = the gap after one more line the repo log refused
 * .why = the first refusal opens the gap with its cause; each later one adds to its count
 */
const asTraceGapWithRepoFault = (input: {
  gap: CloneTraceGap | null;
  cause: string;
}): CloneTraceGap =>
  input.gap
    ? { ...input.gap, count: input.gap.count + 1 }
    : {
        count: 1,
        cause: input.cause,
        fallbackPath: null,
        lost: 0,
        lostCause: null,
      };

/**
 * .what = the per-day fallback log path for a repo's trace line
 * .why = the fallback keeps the repo log's own day filename, so a reader finds a day's lines
 *   under the same name in either dir
 */
const asCloneTraceFallbackPath = (input: {
  fallbackDir: string;
  repoPath: string;
  at: Date;
}): string =>
  join(
    input.fallbackDir,
    basename(getCloneTraceLogPath({ repoPath: input.repoPath, at: input.at })),
  );

/**
 * .what = the gap after the fallback log took a line the repo log refused
 * .why = the gap line names where those lines went
 */
const asTraceGapWithFallback = (input: {
  gap: CloneTraceGap;
  fallbackPath: string;
}): CloneTraceGap => ({ ...input.gap, fallbackPath: input.fallbackPath });

/**
 * .what = the gap after the fallback log refused that line too
 * .why = a line that reached neither log is lost; the gap line must count it and say why
 */
const asTraceGapWithLoss = (input: {
  gap: CloneTraceGap;
  cause: string;
}): CloneTraceGap => ({
  ...input.gap,
  lost: input.gap.lost + 1,
  lostCause: input.cause,
});

/**
 * .what = the one line that names a gap in the repo trace log
 * .why = a reader of the repo log must learn of its silent stretch where they already look:
 *   how many lines, why, where they went, and how many were lost
 */
const asCloneTraceGapLine = (input: { gap: CloneTraceGap }): string => {
  const { gap } = input;
  const kept = gap.count - gap.lost;
  const keptPart =
    kept > 0 && gap.fallbackPath
      ? `; ${asCountPhrase({ count: kept, one: 'is', many: 'are' })} in ${gap.fallbackPath}`
      : '';
  const lostPart =
    gap.lost > 0
      ? `; ${asCountPhrase({ count: gap.lost, one: 'was', many: 'were' })} lost, the fallback was unwritable too (${gap.lostCause})`
      : '';
  return `clone trace log was unwritable for ${asCountPhrase({ count: gap.count, one: 'line', many: 'lines' })} (${gap.cause})${keptPart}${lostPart}\n`;
};

/**
 * .what = a count with the word that agrees with it: `1 line`, `2 lines`, `1 was`, `2 were`
 * .why = the gap line is read by a human; `1 lines` reads as a defect in the log itself
 */
const asCountPhrase = (input: {
  count: number;
  one: string;
  many: string;
}): string => `${input.count} ${input.count === 1 ? input.one : input.many}`;

/**
 * .what = the errno code of an fs fault, for the gap line
 * .why = the code (`EACCES`, `ENOSPC`) names the cause in one word; the full message carries a
 *   path the gap line already states
 */
const asErrorCode = (input: { error: unknown }): string =>
  typeof input.error === 'object' &&
  input.error !== null &&
  'code' in input.error &&
  typeof input.error.code === 'string'
    ? input.error.code
    : 'unknown';
