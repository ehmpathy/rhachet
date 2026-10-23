import { ConstraintError } from 'helpful-errors';

import type { RoleBootSpec } from '@src/domain.objects/RoleBootSpec';

/**
 * .what = refuses a focus the role does not declare
 * .why = a focus that names no declared subject would boot no subject at all, at exit 0. the
 *        refusal names the role, the focus and the subjects the role does declare, so the fix
 *        is one copy away (`rule.require.errors-name-the-fix`)
 *
 * .note = `focusFrom` names where the focus came from, since the two need different fixes:
 *         - `typed`: a human just typed it on enroll — a typo; pick a declared subject
 *         - `typed.init`: typed on init, which `prepare:rhachet` also runs. the focus may be a
 *           typo, or a replay a role upgrade outdated; the hint names both fixes, and the replay
 *           fix carries `--prep`, since only `--prep` rewrites the replay
 *         - `recorded`: an actor or the repo recorded it before a role upgrade dropped the
 *           subject (U1) — a re-enroll mints a new actor and clears naught while the old
 *           actor's clones live, so the fix ends those clones or re-points the repo record
 * .note = a role with no subjects (no boot.yml, or a simple-mode one) has no subject to focus
 * .note = `subjects: null` is the whole role, which every spec admits
 * .note = pure — the spec is read by the caller
 */
export const assertRoleFocusDeclared = (input: {
  slugRole: string;
  subjects: string[] | null;
  config: RoleBootSpec | null;
  focusFrom: 'typed' | 'typed.init' | 'recorded';
}): void => {
  // the whole role needs no check
  if (input.subjects === null || input.subjects.length === 0) return;

  // a role with no subjects cannot be focused
  if (!input.config || input.config.mode !== 'subject')
    throw new ConstraintError(
      `role '${input.slugRole}' declares no subjects, so it cannot be focused`,
      {
        role: input.slugRole,
        focus: input.subjects,
        mode: input.config?.mode ?? 'none',
        hint:
          input.focusFrom !== 'recorded'
            ? `name '${input.slugRole}' whole, with no ::<subject>`
            : asHintForRecordedFocus({
                slugRole: input.slugRole,
                declared: [],
              }),
      },
    );

  // every focused subject must be declared
  const declared = Object.keys(input.config.subjects);
  const undeclared = input.subjects.filter(
    (subject) => !declared.includes(subject),
  );
  if (undeclared.length > 0)
    throw new ConstraintError(
      `role '${input.slugRole}' declares no subject '${undeclared.join(', ')}'`,
      {
        role: input.slugRole,
        focus: undeclared,
        declared,
        hint: asHintForUndeclaredFocus({
          slugRole: input.slugRole,
          declared,
          focusFrom: input.focusFrom,
        }),
      },
    );
};

/**
 * .what = the declared subjects of a role, as the focus tokens a caller can type
 */
const asFocusTokens = (input: {
  slugRole: string;
  declared: string[];
}): string =>
  input.declared.map((subject) => `${input.slugRole}::${subject}`).join(', ');

/**
 * .what = the fix for a focus that names an undeclared subject, by where the focus came from
 */
const asHintForUndeclaredFocus = (input: {
  slugRole: string;
  declared: string[];
  focusFrom: 'typed' | 'typed.init' | 'recorded';
}): string => {
  if (input.focusFrom === 'recorded')
    return asHintForRecordedFocus({
      slugRole: input.slugRole,
      declared: input.declared,
    });
  const hintTyped = `focus one of: ${asFocusTokens(input)}`;
  if (input.focusFrom === 'typed') return hintTyped;
  return `${hintTyped}. if \`prepare:rhachet\` ran this init, its replay names a subject the role dropped; rewrite it with \`rhx init --prep --roles +${input.slugRole}::<one of ${input.declared.join(', ')}>\``;
};

/**
 * .what = the fix for a recorded focus a role upgrade dropped (U1)
 * .why = the actor that holds it stays live while its clones do, so a re-enroll alone clears
 *        naught; the fixes that work are to end those clones, or re-point the repo's record
 * .note = `--hooks` rides the record fix: an upgrade halted here skipped its hook sync, and an
 *        init syncs hooks only on `--hooks`, so the record fix alone would leave the rails stale
 */
const asHintForRecordedFocus = (input: {
  slugRole: string;
  declared: string[];
}): string => {
  const target =
    input.declared.length > 0
      ? `${input.slugRole}::<one of ${input.declared.join(', ')}>`
      : input.slugRole;
  return `the focus was recorded before the role dropped it. for the repo's record (a bare enroll inherits it), run \`rhx init --roles +${target} --hooks\` — it re-records the focus and lands the hooks a halted upgrade skipped; for an actor that holds it, end its live clones so the sweep skips it, then enroll at ${target}`;
};
