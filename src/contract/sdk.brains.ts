/**
 * .what = lightweight brain-focused entry point for rhachet
 * .why = enables consumers to import only brain-related functionality
 *        without pulling in the entire SDK (stitchers, templates, etc.)
 *
 * usage:
 *   import { genContextBrain, BrainAtom, BrainRepl } from 'rhachet/brain';
 */

// brain domain objects
export { BrainAtom } from '@src/domain.objects/BrainAtom';
export { BrainChoiceNotFoundError } from '@src/domain.objects/BrainChoiceNotFoundError';
export { BrainEpisode } from '@src/domain.objects/BrainEpisode';
export { BrainExchange } from '@src/domain.objects/BrainExchange';
export type { BrainGrain } from '@src/domain.objects/BrainGrain';
export { BrainHook } from '@src/domain.objects/BrainHook';
export type { BrainHookEvent } from '@src/domain.objects/BrainHookEvent';
export type { BrainHookFilter } from '@src/domain.objects/BrainHookFilter';
export type { BrainHooksAdapter } from '@src/domain.objects/BrainHooksAdapter';
export type { BrainHooksAdapterDao } from '@src/domain.objects/BrainHooksAdapterDao';
export {
  type AsBrainOutputCallsFor,
  type AsBrainOutputOutputFor,
  type AsBrainOutputSeriesFor,
  BrainOutput,
} from '@src/domain.objects/BrainOutput';
export { BrainOutputMetrics } from '@src/domain.objects/BrainOutputMetrics';
export type { BrainPlugs } from '@src/domain.objects/BrainPlugs';
export type { BrainPlugToolDefinition } from '@src/domain.objects/BrainPlugToolDefinition';
export type { BrainPlugToolExecution } from '@src/domain.objects/BrainPlugToolExecution';
export type { BrainPlugToolInvocation } from '@src/domain.objects/BrainPlugToolInvocation';
export { BrainRepl } from '@src/domain.objects/BrainRepl';
export { BrainSeries } from '@src/domain.objects/BrainSeries';
export { BrainSpec } from '@src/domain.objects/BrainSpec';
export type { BrainSpecifier } from '@src/domain.objects/BrainSpecifier';
export type { BrainSupplierSlug } from '@src/domain.objects/BrainSupplierSlug';
export {
  type BrainChoice,
  ContextBrain,
  isBrainAtom,
  isBrainRepl,
} from '@src/domain.objects/ContextBrain';
export { asBrainPlugToolDict } from '@src/domain.operations/brainContinuation/asBrainPlugToolDict';
export { genBrainContinuables } from '@src/domain.operations/brainContinuation/genBrainContinuables';
export { genBrainPlugToolDeclaration } from '@src/domain.operations/brainContinuation/genBrainPlugToolDeclaration';
// brain operations
export { calcBrainOutputCost } from '@src/domain.operations/brainCost/calcBrainOutputCost';
export { calcBrainTokens } from '@src/domain.operations/brainCost/calcBrainTokens';
export { getAvailableBrains } from '@src/domain.operations/brains/getAvailableBrains';
export { castBriefsToPrompt } from '@src/domain.operations/briefs/castBriefsToPrompt';
export { genContextBrain } from '@src/domain.operations/context/genContextBrain';
export { getAvailableBrainsInWords } from '@src/domain.operations/context/getAvailableBrainsInWords';
