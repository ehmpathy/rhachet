import { REPO_ACTOR_EXID } from '@src/domain.operations/actor/enrolled/constants';

import type { BrainDirBootScope } from './BrainDirBootRender';

/**
 * .what = the address of a brain dir scope — `brain://<namespace>=<value>`, the actor dir's
 *         own token (`actor.via.repo=ambient` → `brain://repo=ambient`,
 *         `actor.via.hash=<h>` → `brain://hash=<h>`)
 * .why = every line that speaks of a brain dir — a sync tree header, a failure
 *        headline — names WHICH dir it speaks of, and names it the one way, so a human maps
 *        an address to its dir on sight. the actor enumeration itself spans every actor
 *        dir, so it is `brain://*`
 *
 * .note = it lives in its own file because two unrelated emitters read it: the sync
 *   report and the failure lines. a shared label under one emitter's filename reads as
 *   that emitter's private helper, and the next author duplicates it rather than imports
 *   it (`rule.always.reuse-pavement-before-improvise`)
 */
export const asBrainDirBootScopeLabel = (input: {
  scope: BrainDirBootScope;
}): string => {
  if (input.scope.kind === 'repo') return `brain://${REPO_ACTOR_EXID}`;
  if (input.scope.kind === 'actors') return 'brain://*';
  return `brain://${input.scope.actorExid}`;
};
