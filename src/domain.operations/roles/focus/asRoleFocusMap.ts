import { asRoleFocusParts } from './asRoleFocusParts';

/**
 * .what = groups an enrolled roleset by role, with the subjects each role is focused on
 * .why = an exact set may name several foci of one role, which union (`mechanic::a,mechanic::b`);
 *        the render and the hook filter each want one entry per role
 *
 * .note = `subjects: null` means the whole role. a role named whole and focused in one set is
 *         refused upstream (`getRoleDeltas`), so a whole entry never meets a focused one here;
 *         were it to, the whole role wins, as it is the superset
 * .note = order is the order of first appearance; subjects keep their typed order, deduped
 * .note = pure transformer — no i/o, deterministic
 */
export const asRoleFocusMap = (input: {
  tokens: string[];
}): Array<{ role: string; subjects: string[] | null }> =>
  input.tokens.reduce<Array<{ role: string; subjects: string[] | null }>>(
    (entries, token) => {
      const { role, subject } = asRoleFocusParts({ token });
      const prior = entries.find((entry) => entry.role === role);

      // first sight of the role → a new entry
      if (!prior)
        return [...entries, { role, subjects: subject ? [subject] : null }];

      // the whole role absorbs every focus of it
      if (prior.subjects === null || subject === null)
        return entries.map((entry) =>
          entry === prior ? { role, subjects: null } : entry,
        );

      // a further focus of a focused role unions, deduped
      if (prior.subjects.includes(subject)) return entries;
      return entries.map((entry) =>
        entry === prior
          ? { role, subjects: [...(prior.subjects ?? []), subject] }
          : entry,
      );
    },
    [],
  );
