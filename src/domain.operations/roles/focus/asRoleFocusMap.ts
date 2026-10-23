import { isRoleSpecifierMatch } from '@src/domain.operations/roles/isRoleSpecifierMatch';
import { parseRoleSpecifier } from '@src/domain.operations/roles/parseRoleSpecifier';

import { asRoleFocusParts } from './asRoleFocusParts';

/**
 * .what = groups an enrolled roleset by role, with the subjects each role is focused on
 * .why = an exact set may name several foci of one role, which union (`mechanic::a,mechanic::b`);
 *        the render and the hook filter each want one entry per role
 *
 * .note = two tokens name one role by `isRoleSpecifierMatch`, the rule every role comparison
 *         shares — so `ehmpathy/mechanic::flow` and `mechanic::lean` hold one entry, and the
 *         entry keeps the repo-qualified name
 * .note = `subjects: null` means the whole role. a role named whole and focused in one set is
 *         refused upstream (`getRoleDeltas`), so a whole entry never meets a focused one here;
 *         were it to, the whole role wins, as it is the superset
 * .note = order is the order of first appearance; subjects are deduped, and the render reads
 *         them in the spec's declaration order (`computeBootPlan`), so typed order never
 *         changes what boots
 * .note = pure transformer — no i/o, deterministic
 */
export const asRoleFocusMap = (input: {
  tokens: string[];
}): Array<{ role: string; subjects: string[] | null }> =>
  input.tokens.reduce<Array<{ role: string; subjects: string[] | null }>>(
    (entries, token) => {
      const { role, subject } = asRoleFocusParts({ token });
      const prior = entries.find((entry) =>
        isRoleSpecifierMatch({ left: entry.role, right: role }),
      );

      // first sight of the role → a new entry
      if (!prior)
        return [...entries, { role, subjects: subject ? [subject] : null }];

      // the merged entry keeps the more specific name
      const roleKept = asRoleNameMoreQualified({
        left: prior.role,
        right: role,
      });

      // the whole role absorbs every focus of it
      if (prior.subjects === null || subject === null)
        return entries.map((entry) =>
          entry === prior ? { role: roleKept, subjects: null } : entry,
        );

      // a further focus of a focused role unions, deduped
      const subjects = prior.subjects.includes(subject)
        ? prior.subjects
        : [...prior.subjects, subject];
      return entries.map((entry) =>
        entry === prior ? { role: roleKept, subjects } : entry,
      );
    },
    [],
  );

/**
 * .what = of two names for one role, the repo-qualified one
 * .why = a qualified name pins the repo; the bare one may name the role in any repo
 */
const asRoleNameMoreQualified = (input: {
  left: string;
  right: string;
}): string =>
  parseRoleSpecifier({ specifier: input.left }).repo === null
    ? input.right
    : input.left;
