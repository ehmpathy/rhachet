import { spawnSync } from 'node:child_process';

/**
 * .what = how long one `git status` probe may take before it is read as a fault
 * .why  = the probe gates a DELETE, so a hung git must never hold a human's terminal —
 *         a timeout reads as "cannot restore", which refuses rather than drops
 */
const PROBE_TIMEOUT_MS = 10_000;

/**
 * .what = of the paths asked, the ones git could NOT hand back after a delete
 * .why  = a drop is safe ONLY where git holds a copy. an untracked, dirty, or ignored
 *         file is hand-authored work, and its delete is unrecoverable — so a caller that
 *         would delete it must refuse instead
 *
 * .note = one `git status --porcelain --ignored` per path, and ANY output at all is a
 *         remark git has about that path — untracked (`??`), modified (` M`), staged
 *         (`M `), or ignored (`!!`). silence means tracked, clean, and committed, which
 *         is the one state a delete may proceed from
 * .note = a probe that faults — git absent, no repo, a timeout — reports EVERY path as
 *         unrestorable. the safe direction: with no evidence of a copy, assume none
 */
export const getAllPathsGitCannotRestore = (input: {
  cwd: string;
  paths: string[];
}): string[] => {
  if (input.paths.length === 0) return [];
  return input.paths.filter((path) => {
    const probe = spawnSync(
      'git',
      ['status', '--porcelain', '--ignored', '--', path],
      { cwd: input.cwd, encoding: 'utf8', timeout: PROBE_TIMEOUT_MS },
    );
    if (probe.error) return true;
    if (probe.status !== 0) return true;
    return (probe.stdout ?? '').trim() !== '';
  });
};
