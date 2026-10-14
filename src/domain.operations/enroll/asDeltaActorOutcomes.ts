import type { RoleSlug } from '@src/domain.objects/RoleSlug';
import type { BrainDirBootFailure } from '@src/domain.operations/boot/BrainDirBootRender';

/**
 * .what = what one delta actor's re-derive did: rewrote it, failed, or left it (null)
 */
export type DeltaActorOutcome =
  | { rederived: { actorExid: string; before: RoleSlug[]; after: RoleSlug[] } }
  | { failure: BrainDirBootFailure }
  | null;

/**
 * .what = split the per-actor outcomes of a delta re-derive into the actors rewritten and
 *   the actors that failed
 * .why = the orchestrator then reads as one step; the discriminant is read once, here
 *
 * .note = a null outcome (an actor left as it was) lands in neither list
 */
export const asDeltaActorOutcomes = (input: {
  outcomes: DeltaActorOutcome[];
}): {
  rederived: { actorExid: string; before: RoleSlug[]; after: RoleSlug[] }[];
  failures: BrainDirBootFailure[];
} => ({
  rederived: input.outcomes.flatMap((outcome) =>
    outcome && 'rederived' in outcome ? [outcome.rederived] : [],
  ),
  failures: input.outcomes.flatMap((outcome) =>
    outcome && 'failure' in outcome ? [outcome.failure] : [],
  ),
});
