import { ConstraintError } from 'helpful-errors';

import { CLONE_SPAWN_DEPTH_MAX } from './asCloneSpawnDepth';

/**
 * .what = refuse a spawn whose child would sit past the depth limit
 * .why =
 *   - one refusal for both spawn doors (`rhx enroll` and the repl seam), so a clone that
 *     hits the limit reads the same line whichever door it tried
 *   - it fires BEFORE any dir, child, or env scope exists, so a chain never half-forms
 *
 * .note = the hint never names the depth env var. an agent reads this refusal, and an
 *   absent var reads as a depth-0 caller, so a hint that says "clear the var" is the
 *   recipe to pass the limit
 */
export const assertCloneSpawnDepthWithinLimit = (input: {
  depthChild: number;
}): void => {
  if (input.depthChild <= CLONE_SPAWN_DEPTH_MAX) return;

  const depthCaller = input.depthChild - 1;
  throw new ConstraintError('clone spawn depth limit reached', {
    hint: `a clone at depth ${depthCaller} may not spawn another — ask the clone that spawned you, or a human, to stand this one up. a human in a shell a clone opened: run \`rhx enroll\` from a fresh terminal`,
    depth: depthCaller,
    depthMaxToSpawn: CLONE_SPAWN_DEPTH_MAX - 1,
  });
};
