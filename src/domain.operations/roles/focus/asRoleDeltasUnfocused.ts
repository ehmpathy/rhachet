import { RoleDelta } from '@src/domain.objects/RoleDelta';

import { asRoleFocusParts } from './asRoleFocusParts';

/**
 * .what = the deltas with each focus stripped, deduped
 * .why = a link is a whole role dir, so the link and the keyrack read the role alone. a
 *        focus is no reason to link half of one, and two foci of one role link it once
 *
 * .note = pure transformer — no i/o, deterministic
 */
export const asRoleDeltasUnfocused = (input: {
  deltas: RoleDelta[];
}): RoleDelta[] =>
  input.deltas
    .map(
      (delta) =>
        new RoleDelta({
          kind: delta.kind,
          role: asRoleFocusParts({ token: delta.role }).role,
        }),
    )
    .filter(
      (delta, index, all) =>
        all.findIndex(
          (other) => other.kind === delta.kind && other.role === delta.role,
        ) === index,
    );
