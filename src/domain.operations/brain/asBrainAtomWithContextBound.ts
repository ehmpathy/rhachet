import type { BrainAtom } from '@src/domain.objects/BrainAtom';

import { asBrainOutput } from './asBrainOutput';

/**
 * .what = wraps brain atom to merge bound context with caller context
 * .why = enables pre-bound supplier creds while callers can still extend/override
 *
 * .note = caller context takes precedence over bound context
 * .note = TContextBound is flexible to support discovery mode where TContext is erased
 * .note = cast to TContext is intentional: discovery mode erases TContext to unknown,
 *         but the wrapped brain still expects its original TContext shape.
 *         this cast is the single location where we bridge the type gap.
 */
export const asBrainAtomWithContextBound = <
  TContext,
  TContextBound extends Record<string, unknown> = Record<string, unknown>,
>(
  brain: BrainAtom<TContext>,
  contextBound: TContextBound,
): BrainAtom<Partial<TContext>> => ({
  ...brain,
  ask: async (input, contextCaller) => {
    // merge bound + caller context, caller takes precedence
    const contextMerged = { ...contextBound, ...contextCaller } as TContext;
    const result = await brain.ask(input, contextMerged);
    return asBrainOutput(result);
  },
});
