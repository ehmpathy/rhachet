import { asRoleFocusParts } from '@src/domain.operations/roles/focus/asRoleFocusParts';
import { isRoleSpecifierMatch } from '@src/domain.operations/roles/isRoleSpecifierMatch';

/**
 * .what = applies a role delta to a held roleset: a removal drops its role, the additions of a
 *         held role replace what was held for it, and an addition of an unheld role appends
 * .why = a `+` delta re-points its role rather than stack beside it (fulcrum F6) —
 *        `+mechanic::flow` atop a held `mechanic` narrows it, atop `mechanic::code.prod` moves
 *        it, and `+mechanic` widens it. enroll and `prepare:rhachet` both persist that rule, so
 *        it lives here once
 *
 * .note = the rule is one ROLE per delta, not one TOKEN: `+mechanic::a,+mechanic::b` atop a held
 *         `mechanic` yields both tokens, which union into one entry wherever the set is read
 *         (`asRoleFocusMap`, S2P)
 * .note = two tokens name one role by `isRoleSpecifierMatch` over the focus-stripped role,
 *         so `ehmpathy/mechanic` and `mechanic` match (Q1)
 * .note = an addition with the held entry's own focus changes naught, so the entry keeps
 *         its typed form (`+ehmpathy/mechanic` atop `mechanic` stays `mechanic`)
 * .note = held order is kept; new roles append in delta order; dedupe keeps one of each
 * .note = pure transformer — no i/o, deterministic
 */
export const asRolesUpsertedByDelta = (input: {
  rolesHeld: string[];
  additions: string[];
  removals: string[];
}): string[] => {
  // walk the held set: drop each removed role, upsert each added role in place
  const rolesPatched = input.rolesHeld.flatMap((held): string[] => {
    if (
      input.removals.some((removal) =>
        isSameRole({ left: held, right: removal }),
      )
    )
      return [];
    const additionsOfHeld = input.additions.filter((addition) =>
      isSameRole({ left: held, right: addition }),
    );

    // no addition names this role → the held entry stays as it is
    if (additionsOfHeld.length === 0) return [held];

    // an addition at the held focus changes naught, so the held form is kept
    return isSameFocus({ held, additions: additionsOfHeld })
      ? [held]
      : additionsOfHeld;
  });

  // then append each addition of a role the held set did not name
  const rolesAdded = input.additions.filter(
    (addition) =>
      !input.rolesHeld.some((held) =>
        isSameRole({ left: held, right: addition }),
      ),
  );
  return [...new Set([...rolesPatched, ...rolesAdded])];
};

/**
 * .what = whether two tokens name one role, whatever their focus or repo qualifier
 */
const isSameRole = (pair: { left: string; right: string }): boolean =>
  isRoleSpecifierMatch({
    left: asRoleFocusParts({ token: pair.left }).role,
    right: asRoleFocusParts({ token: pair.right }).role,
  });

/**
 * .what = whether a held entry's additions re-type the held focus, and change naught
 */
const isSameFocus = (input: { held: string; additions: string[] }): boolean =>
  input.additions.length === 1 &&
  asRoleFocusParts({ token: input.additions[0] ?? '' }).subject ===
    asRoleFocusParts({ token: input.held }).subject;
