import { ConstraintError } from 'helpful-errors';

import { RoleDelta } from '@src/domain.objects/RoleDelta';
import type { RoleSpecifier } from '@src/domain.objects/RoleSpecifier';
import { asRoleFocusParts } from '@src/domain.operations/roles/focus/asRoleFocusParts';
import { isRoleSpecifierMatch } from '@src/domain.operations/roles/isRoleSpecifierMatch';
import { parseRoleSpecifier } from '@src/domain.operations/roles/parseRoleSpecifier';

/**
 * .what = parses raw `--roles` tokens into a validated `RoleDelta[]`
 * .why = the ONE shared `--roles` parser: turns each sigil token into a RoleDelta
 *        so `rhx init --roles +role -role` (and enroll, upgrade) all speak the same
 *        grammar and the same dobj — one place to hold the rules, no divergence
 *
 * .note = each token maps to a delta by its lead sigil:
 *   - `+role` => kind `addition`      (adjust relative to the current/default set)
 *   - `-role` => kind `subtraction`   (adjust relative to the current/default set)
 *   - bare `role` => kind `absolute`  (a member of a replace-the-whole-set spec)
 * .note = the returned list is homogeneous: all-`absolute` (replace) OR
 *   all-`addition`/`subtraction` (incremental). a mixed call is rejected — the base
 *   set would be ambiguous (current set vs empty). derive mode via getRoleDeltaMode.
 * .note = additions/subtractions dedupe (repeats collapse) and a role both added and
 *   removed in one call is rejected; absolute members pass through as authored (the
 *   replace path dedupes downstream). sigils are stripped; each residual role is a
 *   valid RoleSpecifier (`role` or `repo/role`) for downstream lookup.
 * .note = pure transformer — no i/o, deterministic.
 */
export const getRoleDeltas = (input: { tokens: string[] }): RoleDelta[] => {
  // trim tokens for consistent sigil + emptiness checks
  const trimmed = input.tokens.map((token) => token.trim());

  // reject a wholly empty token list — caller must pass at least one role
  if (trimmed.length === 0)
    throw new ConstraintError(
      'no roles specified — pass at least one role (e.g. mechanic, or +architect -reviewer), or omit --roles to use defaults',
      { tokens: input.tokens },
    );

  // classify each token by its lead sigil into a RoleDelta (throws on empty)
  const deltas = trimmed.map((token): RoleDelta => {
    // addition token: strip the '+' prefix, require a non-empty role
    if (token.startsWith('+')) {
      const role = token.slice(1).trim();
      if (!role)
        throw new ConstraintError('role specifier cannot be empty after "+"', {
          token,
          tokens: input.tokens,
        });
      return new RoleDelta({ kind: 'addition', role });
    }

    // subtraction token: strip the '-' prefix, require a non-empty role
    if (token.startsWith('-')) {
      const role = token.slice(1).trim();
      if (!role)
        throw new ConstraintError('role specifier cannot be empty after "-"', {
          token,
          tokens: input.tokens,
        });
      return new RoleDelta({ kind: 'subtraction', role });
    }

    // bare token: an absolute member
    if (!token)
      throw new ConstraintError('role specifier cannot be empty', {
        token,
        tokens: input.tokens,
      });
    return new RoleDelta({ kind: 'absolute', role: token });
  });

  // every token's focus must read <role>::<subject>; a malformed one refuses here
  deltas.forEach((delta) => asRoleFocusParts({ token: delta.role }));

  // a subtraction removes a role whole, so a focus on it names a removal the set has no
  //   shape for — refuse, and name the two moves that do exist (fulcrum F1)
  const subtractionFocused = deltas.find(
    (delta) =>
      delta.kind === 'subtraction' &&
      asRoleFocusParts({ token: delta.role }).subject !== null,
  );
  if (subtractionFocused) {
    const { role } = asRoleFocusParts({ token: subtractionFocused.role });
    throw new ConstraintError(
      `a subtraction removes a role whole; '-${subtractionFocused.role}' names a focus`,
      {
        token: `-${subtractionFocused.role}`,
        tokens: input.tokens,
        hint: `-${role} removes the role whole; to change its focus, enroll the exact set or +${role}::<subject>`,
      },
    );
  }

  // partition by kind to enforce the homogeneity + conflict invariants
  const absolutes = deltas.filter((delta) => delta.kind === 'absolute');
  const additions = deltas.filter((delta) => delta.kind === 'addition');
  const subtractions = deltas.filter((delta) => delta.kind === 'subtraction');

  // decide mode: any sigiled token => incremental
  const isIncremental = additions.length > 0 || subtractions.length > 0;

  // a bare word beside a `+role::subject` reads as a second subject typed without its role
  //   (`+mechanic::101,flow`): name the one-subject-per-token form, never the generic mix
  const rolesAddedAtFocus = additions
    .map((delta) => asRoleFocusParts({ token: delta.role }))
    .filter((parts) => parts.subject !== null)
    .map((parts) => parts.role);
  const subjectBare = absolutes.find(
    (delta) => asRoleFocusParts({ token: delta.role }).subject === null,
  );
  if (isIncremental && subjectBare && rolesAddedAtFocus.length > 0)
    throw new ConstraintError(
      `'${subjectBare.role}' has no sigil beside a focused delta — one subject per token`,
      {
        token: subjectBare.role,
        tokens: input.tokens,
        hint: `to focus at a second subject, give it its role and sigil: +${rolesAddedAtFocus[0]}::${subjectBare.role}; to add a role, give it a sigil: +${subjectBare.role}`,
      },
    );

  // reject mixed calls — all-absolute OR all-incremental, never both
  if (isIncremental && absolutes.length > 0)
    throw new ConstraintError(
      'cannot mix absolute and incremental roles — use all-absolute (mechanic behaver) OR all-incremental (+architect -reviewer)',
      {
        absolutes: absolutes.map((delta) => delta.role),
        additions: additions.map((delta) => delta.role),
        subtractions: subtractions.map((delta) => delta.role),
        tokens: input.tokens,
      },
    );

  // a role named both whole and focused is either redundant or a contradiction — refuse
  //   rather than guess which was meant (fulcrum F2). an exact set and a `+` delta alike, so
  //   a delta can never persist two entries of one role, one whole and one focused
  const sigil = isIncremental ? '+' : '';
  const roleWholeAndFocused = findRoleNamedWholeAndFocused({
    deltas: isIncremental ? additions : absolutes,
  });
  if (roleWholeAndFocused)
    throw new ConstraintError(
      `role '${roleWholeAndFocused.role}' is named both whole and focused`,
      {
        tokens: input.tokens,
        hint: `name '${sigil}${roleWholeAndFocused.role}' to boot every subject, or '${sigil}${roleWholeAndFocused.role}::${roleWholeAndFocused.subject}' to boot that one — not both`,
      },
    );

  // absolute mode: return the members as authored (replace path dedupes downstream)
  if (!isIncremental) return absolutes;

  // dedupe additions and subtractions — repeated roles collapse to one
  const additionsUnique = dedupeByRole({ deltas: additions });
  const subtractionsUnique = dedupeByRole({ deltas: subtractions });

  // reject a role that is both added and removed in one call — contradictory.
  // compare at the role-slug level so `+architect -ehmpathy/architect` is caught:
  // an unqualified token could match any repo, so it conflicts with any
  // same-slug token; two qualified tokens conflict only within the same repo.
  // reuse the shared isRoleSpecifierMatch so the match rule stays in one place.
  const contradiction = additionsUnique.find((addition) =>
    subtractionsUnique.some((subtraction) =>
      isRoleSpecifierMatch({
        left: asRoleFocusParts({ token: addition.role }).role,
        right: subtraction.role,
      }),
    ),
  );
  if (contradiction)
    throw new ConstraintError(
      `cannot both add and remove role "${parseRoleSpecifier({ specifier: asRoleFocusParts({ token: contradiction.role }).role }).role}" in one call`,
      {
        additions: additionsUnique.map((delta) => delta.role),
        subtractions: subtractionsUnique.map((delta) => delta.role),
        tokens: input.tokens,
      },
    );

  // incremental deltas: additions first, then subtractions (order within preserved)
  return [...additionsUnique, ...subtractionsUnique];
};

/**
 * .what = the first focus whose role is also named whole in the same call, or null
 * .why = `mechanic mechanic::flow` (or `+mechanic +mechanic::flow`) is redundant or a
 *   contradiction (fulcrum F2); the parts are parsed once, so the scan reads as the rule
 *   rather than as a nested reparse
 */
const findRoleNamedWholeAndFocused = (input: {
  deltas: RoleDelta[];
}): { role: string; subject: string | null } | null => {
  const parts = input.deltas.map((delta) =>
    asRoleFocusParts({ token: delta.role }),
  );
  const wholes = parts.filter((part) => part.subject === null);
  return (
    parts.find(
      (focus) =>
        focus.subject !== null &&
        wholes.some((whole) =>
          isRoleSpecifierMatch({ left: whole.role, right: focus.role }),
        ),
    ) ?? null
  );
};

/**
 * .what = collapses deltas that repeat the same role, first occurrence wins
 * .why = `+a +a` is one add, not two — keeps the delta set idempotent
 */
const dedupeByRole = (input: { deltas: RoleDelta[] }): RoleDelta[] => {
  const seen = new Set<RoleSpecifier>();
  return input.deltas.filter((delta) => {
    if (seen.has(delta.role)) return false;
    seen.add(delta.role);
    return true;
  });
};
