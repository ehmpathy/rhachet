import type { RoleDelta } from '@src/domain.objects/RoleDelta';

import { asRoleFocusMap } from './asRoleFocusMap';

/**
 * .what = the focused roles a delta set names, one entry per role, with its subjects
 * .why = a check over the foci a `--roles` delta asks for wants only the roles it focuses;
 *        a subtraction removes a role and a whole role carries no focus, so neither is a focus
 *
 * .note = pure transformer — no i/o, deterministic
 */
export const getAllRoleFociOfDeltas = (input: {
  deltas: RoleDelta[];
}): Array<{ role: string; subjects: string[] }> =>
  asRoleFocusMap({
    tokens: input.deltas
      .filter((delta) => delta.kind !== 'subtraction')
      .map((delta) => delta.role),
  }).flatMap((entry) =>
    entry.subjects === null
      ? []
      : [{ role: entry.role, subjects: entry.subjects }],
  );
