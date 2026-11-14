import { asSlugBaseOfActorExid } from '@src/domain.operations/actor/enrolled/asSlugBaseOfActorExid';
import { isActorExidDeclared } from '@src/domain.operations/actor/enrolled/isActorExidDeclared';

/**
 * .what = the declared-form actor exids whose base slug the manifest no longer declares
 * .why = such a dir stays on disk — its clones may still live there, and only `prune` may reap
 *        (`define.invariant.clone-prune-safety`) — so the drift report names it, never in
 *        silence (F15)
 */
export const asActorExidsUndeclared = (input: {
  exids: string[];
  slugsDeclared: string[];
}): string[] =>
  input.exids.filter(
    (exid) =>
      isActorExidDeclared({ exid }) &&
      !input.slugsDeclared.includes(asSlugBaseOfActorExid({ exid })),
  );
