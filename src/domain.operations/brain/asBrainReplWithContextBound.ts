import type { BrainRepl } from '@src/domain.objects/BrainRepl';

import { asBrainOutput } from './asBrainOutput';
import { asBrainReplWithSpawnDepthScope } from './asBrainReplWithSpawnDepthScope';

/**
 * .what = wraps brain repl to merge bound context with caller context
 * .why = enables pre-bound supplier creds while callers can still extend/override
 *
 * .note = caller context takes precedence over bound context
 * .note = TContextBound is flexible to support discovery mode where TContext is erased
 * .note = cast to TContext is intentional: discovery mode erases TContext to unknown,
 *         but the wrapped brain still expects its original TContext shape.
 *         this cast is the single location where we bridge the type gap.
 * .note = a repl brain is a spawn, so the bound repl runs each call inside the spawn
 *         depth scope (`asBrainReplWithSpawnDepthScope`)
 */
export const asBrainReplWithContextBound = <
  TContext,
  TContextBound extends Record<string, unknown> = Record<string, unknown>,
>(
  brain: BrainRepl<TContext>,
  contextBound: TContextBound,
): BrainRepl<Partial<TContext>> => {
  const brainScoped = asBrainReplWithSpawnDepthScope(brain);
  return {
    ...brainScoped,
    ask: async (input, contextCaller) => {
      // merge bound + caller context, caller takes precedence
      const contextMerged = { ...contextBound, ...contextCaller } as TContext;
      return asBrainOutput(await brainScoped.ask(input, contextMerged));
    },
    act: async (input, contextCaller) => {
      // merge bound + caller context, caller takes precedence
      const contextMerged = { ...contextBound, ...contextCaller } as TContext;
      return asBrainOutput(await brainScoped.act(input, contextMerged));
    },
  };
};
