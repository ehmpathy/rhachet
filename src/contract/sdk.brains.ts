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
export type { BrainAtomPlugs } from '@src/domain.objects/BrainAtomPlugs';
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
  type AsBrainOutputSeriesFor,
  BrainOutput,
} from '@src/domain.objects/BrainOutput';
export { BrainOutputMetrics } from '@src/domain.objects/BrainOutputMetrics';
export { BrainRepl } from '@src/domain.objects/BrainRepl';
export type { BrainReplPlugs } from '@src/domain.objects/BrainReplPlugs';
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
export { genBrainContinuables } from '@src/domain.operations/brainContinuation/genBrainContinuables';
// brain operations
export { calcBrainOutputCost } from '@src/domain.operations/brainCost/calcBrainOutputCost';
export { calcBrainTokens } from '@src/domain.operations/brainCost/calcBrainTokens';
export { getAvailableBrains } from '@src/domain.operations/brains/getAvailableBrains';
export { castBriefsToPrompt } from '@src/domain.operations/briefs/castBriefsToPrompt';
export { genContextBrain } from '@src/domain.operations/context/genContextBrain';
export { getAvailableBrainsInWords } from '@src/domain.operations/context/getAvailableBrainsInWords';
