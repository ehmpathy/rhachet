import type { BrainDirBootScope } from './BrainDirBootRender';

/**
 * .what = the human label of a brain dir scope
 * .why = every line that speaks of a brain dir — a sync tree header, a failure
 *        headline — names WHICH dir it speaks of, and names it the one way
 *
 * .note = it lives in its own file because two unrelated emitters read it: the sync
 *   report and the failure lines. a shared label under one emitter's filename reads as
 *   that emitter's private helper, and the next author duplicates it rather than imports
 *   it (`rule.always.reuse-pavement-before-improvise`)
 */
export const asBrainDirBootScopeLabel = (input: {
  scope: BrainDirBootScope;
}): string => {
  if (input.scope.kind === 'default') return 'default';
  if (input.scope.kind === 'actors') return 'actors';
  return `actor ${input.scope.actorHash}`;
};
