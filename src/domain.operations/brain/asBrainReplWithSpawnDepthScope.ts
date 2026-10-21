import type { BrainRepl } from '@src/domain.objects/BrainRepl';
import { withCloneSpawnDepthScope } from '@src/domain.operations/spawn/withCloneSpawnDepthScope';

/**
 * .what = wraps a brain repl so each `ask` and `act` runs inside the spawn depth scope
 * .why =
 *   - a repl brain is a spawn, so every repl call must be refused past the depth limit
 *     and must hand its child the depth it is born at
 *   - one wrapper for every place a repl is handed out (the context binder, and the
 *     actor ask/act ops behind `rhachet ask`, `rhachet act` and `clone.ask/act`), so no door
 *     reaches a repl around the guard
 *
 * .note = the scope is reentrant, so a repl wrapped twice holds one scope, not two
 * .note = atoms are not wrapped: an atom is one inference call, never a spawn
 */
export const asBrainReplWithSpawnDepthScope = <TContext>(
  brain: BrainRepl<TContext>,
): BrainRepl<TContext> => ({
  ...brain,
  ask: (input, context) =>
    withCloneSpawnDepthScope(() => brain.ask(input, context)),
  act: (input, context) =>
    withCloneSpawnDepthScope(() => brain.act(input, context)),
});
