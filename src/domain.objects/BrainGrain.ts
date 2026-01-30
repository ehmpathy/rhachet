/**
 * .what = granularity level of brain interaction
 * .why = enables type-safe conditional fields based on brain type
 *
 * the metaphor aligns naturally:
 *   - 'atom' = fine-grained, single inference, no series
 *   - 'repl' = coarse-grained, multi-turn loop, has series
 *
 * .note = used as type discriminant: 'atom' → series is null; 'repl' → series is BrainSeries
 */
export type BrainGrain = 'atom' | 'repl';
