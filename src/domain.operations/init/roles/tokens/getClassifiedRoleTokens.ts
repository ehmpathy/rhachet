import { BadRequestError } from 'helpful-errors';

import type { RoleSpecifier } from '@src/domain.objects/RoleSpecifier';

/**
 * .what = classifies raw `--roles` tokens into absolute or incremental intent
 * .why = enables `rhx init --roles +role -role` to adjust the enrolled set
 *        relative to the current set, without a full respecify
 *
 * .note = mode is decided by presence of any `+`/`-` sigil:
 *   - no sigils => absolute (replace whole set, legacy behavior)
 *   - any sigil => incremental (adjust relative to current set)
 * .note = a mixed call (some bare, some sigiled) is rejected — the base
 *   would be ambiguous (current set vs empty)
 * .note = sigils are stripped here; each residual token is still a valid
 *   RoleSpecifier (`role` or `repo/role`) for downstream lookup
 */
export const getClassifiedRoleTokens = (input: {
  tokens: string[];
}):
  | { mode: 'absolute'; absolutes: RoleSpecifier[] }
  | {
      mode: 'incremental';
      additions: RoleSpecifier[];
      subtractions: RoleSpecifier[];
    } => {
  // trim tokens for consistent sigil + emptiness checks
  const trimmed = input.tokens.map((token) => token.trim());

  // reject a wholly empty token list — caller must pass at least one role
  if (trimmed.length === 0)
    throw new BadRequestError('no roles specified', { tokens: input.tokens });

  // classify each token by its lead sigil into a tagged shape (throws on empty)
  const classified = trimmed.map(
    (
      token,
    ): {
      kind: 'addition' | 'subtraction' | 'absolute';
      role: RoleSpecifier;
    } => {
      // addition token: strip the '+' prefix, require a non-empty role
      if (token.startsWith('+')) {
        const role = token.slice(1).trim();
        if (!role)
          throw new BadRequestError(
            'role specifier cannot be empty after "+"',
            { token, tokens: input.tokens },
          );
        return { kind: 'addition', role };
      }

      // subtraction token: strip the '-' prefix, require a non-empty role
      if (token.startsWith('-')) {
        const role = token.slice(1).trim();
        if (!role)
          throw new BadRequestError(
            'role specifier cannot be empty after "-"',
            { token, tokens: input.tokens },
          );
        return { kind: 'subtraction', role };
      }

      // bare token: an absolute member
      if (!token)
        throw new BadRequestError('role specifier cannot be empty', {
          token,
          tokens: input.tokens,
        });
      return { kind: 'absolute', role: token };
    },
  );

  // partition by kind — immutable construction, no in-place mutation
  const absolutes = classified
    .filter((entry) => entry.kind === 'absolute')
    .map((entry) => entry.role);
  const additions = classified
    .filter((entry) => entry.kind === 'addition')
    .map((entry) => entry.role);
  const subtractions = classified
    .filter((entry) => entry.kind === 'subtraction')
    .map((entry) => entry.role);

  // decide mode: any sigiled token => incremental
  const isIncremental = additions.length > 0 || subtractions.length > 0;

  // reject mixed calls — all-absolute OR all-incremental, never both
  if (isIncremental && absolutes.length > 0)
    throw new BadRequestError(
      'cannot mix absolute and incremental roles — use all-absolute (mechanic behaver) OR all-incremental (+architect -reviewer)',
      { absolutes, additions, subtractions, tokens: input.tokens },
    );

  // absolute mode: return the full set as the replacement
  if (!isIncremental) return { mode: 'absolute', absolutes };

  // dedupe additions and subtractions — repeated tokens collapse to one
  const additionsUnique = [...new Set(additions)];
  const subtractionsUnique = [...new Set(subtractions)];

  // split a specifier into its repo (nullable) and role slug for comparison
  const asParts = (spec: string): { repo: string | null; role: string } => {
    const slashIndex = spec.indexOf('/');
    if (slashIndex === -1) return { repo: null, role: spec };
    return {
      repo: spec.slice(0, slashIndex),
      role: spec.slice(slashIndex + 1),
    };
  };

  // reject a role that is both added and removed in one call — contradictory.
  // compare at the role-slug level so `+architect -ehmpathy/architect` is caught:
  // an unqualified token could match any repo, so it conflicts with any
  // same-slug token; two qualified tokens conflict only within the same repo.
  const additionParts = additionsUnique.map(asParts);
  const subtractionParts = subtractionsUnique.map(asParts);
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
        additions: additionsUnique,
        subtractions: subtractionsUnique,
        tokens: input.tokens,
      },
    );

  return {
    mode: 'incremental',
    additions: additionsUnique,
    subtractions: subtractionsUnique,
  };
};
