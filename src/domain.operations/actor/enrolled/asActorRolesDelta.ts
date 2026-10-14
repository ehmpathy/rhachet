import type { BrainCliEnrollmentSpec } from '@src/domain.objects/BrainCliEnrollmentSpec';

/**
 * .what = the delta an enrollment holds over the ambient roles, as sorted `+role` / `-role`
 *   tokens — or null when the enrollment is not a delta
 * .why = a delta actor is identified by, and re-derived from, this delta
 *   (`inventory.of=requirements.case=2`). an absolute spec (`--roles mechanic`) names its
 *   whole roleset, and a bare enroll names none, so neither is a delta
 *
 * .note = sorted, so the stored delta and its hash never depend on token order
 */
export const asActorRolesDelta = (input: {
  spec: BrainCliEnrollmentSpec;
}): string[] | null => {
  if (input.spec.mode !== 'incremental') return null;
  if (input.spec.deltas.length === 0) return null;
  return input.spec.deltas
    .map((delta) => `${delta.kind === 'addition' ? '+' : '-'}${delta.role}`)
    .sort();
};
