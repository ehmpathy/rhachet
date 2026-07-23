import { BadRequestError } from 'helpful-errors';

import { RoleDelta } from '@src/domain.objects/RoleDelta';
import type { RoleSpecifier } from '@src/domain.objects/RoleSpecifier';
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
    throw new BadRequestError(
      'no roles specified — pass at least one role (e.g. mechanic, or +architect -reviewer), or omit --roles to use defaults',
      { tokens: input.tokens },
    );

  // classify each token by its lead sigil into a RoleDelta (throws on empty)
  const deltas = trimmed.map((token): RoleDelta => {
    // addition token: strip the '+' prefix, require a non-empty role
    if (token.startsWith('+')) {
      const role = token.slice(1).trim();
      if (!role)
        throw new BadRequestError('role specifier cannot be empty after "+"', {
          token,
          tokens: input.tokens,
        });
      return new RoleDelta({ kind: 'addition', role });
    }

    // subtraction token: strip the '-' prefix, require a non-empty role
    if (token.startsWith('-')) {
      const role = token.slice(1).trim();
      if (!role)
        throw new BadRequestError('role specifier cannot be empty after "-"', {
          token,
          tokens: input.tokens,
        });
      return new RoleDelta({ kind: 'subtraction', role });
    }

    // bare token: an absolute member
    if (!token)
      throw new BadRequestError('role specifier cannot be empty', {
        token,
        tokens: input.tokens,
      });
    return new RoleDelta({ kind: 'absolute', role: token });
  });

  // partition by kind to enforce the homogeneity + conflict invariants
  const absolutes = deltas.filter((delta) => delta.kind === 'absolute');
  const additions = deltas.filter((delta) => delta.kind === 'addition');
  const subtractions = deltas.filter((delta) => delta.kind === 'subtraction');

  // decide mode: any sigiled token => incremental
  const isIncremental = additions.length > 0 || subtractions.length > 0;

  // reject mixed calls — all-absolute OR all-incremental, never both
  if (isIncremental && absolutes.length > 0)
    throw new BadRequestError(
      'cannot mix absolute and incremental roles — use all-absolute (mechanic behaver) OR all-incremental (+architect -reviewer)',
      {
        absolutes: absolutes.map((delta) => delta.role),
        additions: additions.map((delta) => delta.role),
        subtractions: subtractions.map((delta) => delta.role),
        tokens: input.tokens,
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
  // reuse the shared parseRoleSpecifier so the repo/role split stays in one place.
  const additionParts = additionsUnique.map((delta) =>
    parseRoleSpecifier({ specifier: delta.role }),
  );
  const subtractionParts = subtractionsUnique.map((delta) =>
    parseRoleSpecifier({ specifier: delta.role }),
  );
  const contradiction = additionParts.find((addition) =>
    subtractionParts.some(
      (subtraction) =>
        addition.role === subtraction.role &&
        (addition.repo === null ||
          subtraction.repo === null ||
          addition.repo === subtraction.repo),
    ),
  );
  if (contradiction)
    throw new BadRequestError(
      `cannot both add and remove role "${contradiction.role}" in one call`,
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
