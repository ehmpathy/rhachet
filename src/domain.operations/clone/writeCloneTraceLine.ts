import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { getCloneTraceLogPath } from './getCloneTraceLogPath';

/**
 * .what = append ONE daemon trace line to the durable per-day trace log
 * .why =
 *   - it is the durable half of `getCloneTraceSink`'s tee, split out so the I/O is clamped
 *     HERMETICALLY: the path is derived from an injected `repoPath` rather than read off
 *     `process.cwd()`, so a clamp points it at a temp dir and never writes into this tree
 *   - the append is intrinsically non-idempotent, and deliberately so — a trace log is a
 *     sequence, so a re-run must add a line rather than converge on one
 *     (`rule.forbid.nonidempotent-mutations`'s stated exception, and the shape
 *     `writeCloneSayDebugLog` already takes for the say debug stream)
 *
 * .note = it THROWS on an I/O fault rather than swallows one. the caller decides what a lost
 *   durable copy costs — and `getCloneTraceSink` names the loss on stderr, where the line it
 *   was tee'ing has already landed (`rule.forbid.failhide`)
 */
export const writeCloneTraceLine = (input: {
  repoPath: string;
  at: Date;
  line: string;
}): void => {
  const path = getCloneTraceLogPath({ repoPath: input.repoPath, at: input.at });
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, input.line, 'utf8');
};
