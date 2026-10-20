import { CLONE_SPAWN_DEPTH_MAX } from './asCloneSpawnDepth';

/**
 * .what = the one notice line an enroll prints when it mints a clone below top level
 *   while a human watches the terminal
 * .why =
 *   - a pipe on stdin (`echo why | rhx enroll claude --reason @stdin`) leaves no tty on
 *     stdin, so the clone is minted at depth 1, and its own reviews are refused stages
 *     later. the notice names that at the moment it happens, not at the refusal
 *   - a headless spawn (cron, ci, a parent clone) has no tty on stderr, so it reads no
 *     notice and its output is unchanged
 *
 * .note = null when the clone is top-level, or when no human watches stderr
 */
export const getCloneSpawnDepthNotice = (input: {
  depth: number;
  isTtyStderr: boolean;
}): string | null => {
  // a clone below the limit may still spawn, so there is naught to say
  if (input.depth < CLONE_SPAWN_DEPTH_MAX) return null;

  // no human watches, so the notice would only be noise in a log
  if (!input.isTtyStderr) return null;

  // a human watches a clone minted below top level
  return [
    `ℹ no tty on stdin, so this clone is minted at depth ${input.depth} — it cannot spawn clones or run repl reviews`,
    `  to mint a top-level clone, enroll at a terminal with no pipe on stdin (e.g. --reason <text>, not @stdin)`,
  ].join('\n');
};
