import { isRoleSpecifierMatch } from '@src/domain.operations/roles/isRoleSpecifierMatch';

import { asRoleFocusMap } from './asRoleFocusMap';
import { asRoleFocusParts } from './asRoleFocusParts';

/**
 * .what = one held role whose focus a `+` delta touched
 * .why = a delta upserts its role in place (F6), so the same `+role::subject` narrows, moves,
 *        or widens, by what was held — or leaves it as held (E2). the receipt names which, so
 *        the outcome is never silent
 */
export interface RoleFocusChange {
  role: string;
  kind: 'given' | 'narrow' | 'move' | 'widen' | 'unchanged' | 'held';

  /** the subjects held before; null for the whole role */
  from: string[] | null;

  /** the subjects held after; null for the whole role */
  to: string[] | null;
}

/**
 * .what = the roles whose focus this call set, in the order they are held after it
 * .why = a role whose focus moved is this receipt's subject, and so is a role first taken at a
 *        focus (`given`): it boots a slice of itself, so that slice is named, never silent.
 *        a whole role added or removed is the extant receipt's subject
 *
 * .note = pure transformer — no i/o, deterministic
 * .note = foci compare as sets, so `a,b` and `b,a` are one focus
 * .note = `additions` are the `+` tokens the call typed. a focused one that lands on a held
 *         entry of the same focus is named `unchanged` (E2); a bare `+mechanic` atop a held
 *         `mechanic` stays silent, as it did before any focus existed
 */
export const asRoleFocusChanges = (input: {
  rolesBefore: string[];
  rolesAfter: string[];
  additions: string[];
}): RoleFocusChange[] => {
  const before = asRoleFocusMap({ tokens: input.rolesBefore });
  const after = asRoleFocusMap({ tokens: input.rolesAfter });

  // the roles a typed `+role::subject` named
  const rolesAddedAtFocus = input.additions
    .map((token) => asRoleFocusParts({ token }))
    .filter((parts) => parts.subject !== null)
    .map((parts) => parts.role);

  return after.flatMap((next): RoleFocusChange[] => {
    // `ehmpathy/mechanic` and `mechanic` name one role
    const held = before.find((one) =>
      isRoleSpecifierMatch({ left: one.role, right: next.role }),
    );
    // a role first taken at a focus is given it; a whole role first taken is no focus change
    if (!held)
      return next.subjects === null
        ? []
        : [{ role: next.role, kind: 'given', from: null, to: next.subjects }];

    // a held focus the call re-typed is named, so a no-op reads as one
    if (isSameFocus({ left: held.subjects, right: next.subjects })) {
      const isRetyped = rolesAddedAtFocus.some((role) =>
        isRoleSpecifierMatch({ left: role, right: next.role }),
      );
      if (!isRetyped) return [];
      return [
        {
          role: next.role,
          kind: 'unchanged',
          from: held.subjects,
          to: next.subjects,
        },
      ];
    }
    return [
      {
        role: next.role,
        kind: asRoleFocusChangeKind({ from: held.subjects, to: next.subjects }),
        from: held.subjects,
        to: next.subjects,
      },
    ];
  });
};

/**
 * .what = whether two foci name the same subjects; null is the whole role
 */
const isSameFocus = (input: {
  left: string[] | null;
  right: string[] | null;
}): boolean => {
  if (input.left === null || input.right === null)
    return input.left === input.right;
  if (input.left.length !== input.right.length) return false;
  const right = input.right;
  return input.left.every((subject) => right.includes(subject));
};

/**
 * .what = the kind of one focus change: whole → focus narrows, focus → whole widens, else moves
 */
const asRoleFocusChangeKind = (input: {
  from: string[] | null;
  to: string[] | null;
}): RoleFocusChange['kind'] => {
  if (input.from === null) return 'narrow';
  if (input.to === null) return 'widen';
  return 'move';
};
