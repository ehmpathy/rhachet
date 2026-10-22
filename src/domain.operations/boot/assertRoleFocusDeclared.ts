import { ConstraintError } from 'helpful-errors';

import type { RoleBootSpec } from '@src/domain.objects/RoleBootSpec';

/**
 * .what = refuses a focus the role does not declare
 * .why = a focus that names no declared subject would boot no subject at all, at exit 0. the
 *        refusal names the role, the focus and the subjects the role does declare, so the fix
 *        is one copy away (`rule.require.errors-name-the-fix`)
 *
 * .note = a role with no subjects (no boot.yml, or a simple-mode one) has no subject to focus
 * .note = `subjects: null` is the whole role, which every spec admits
 * .note = pure — the spec is read by the caller
 */
export const assertRoleFocusDeclared = (input: {
  slugRole: string;
  subjects: string[] | null;
  config: RoleBootSpec | null;
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
        hint: `enroll '${input.slugRole}' whole, with no ::<subject>`,
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
        hint: `focus one of: ${declared.map((subject) => `${input.slugRole}::${subject}`).join(', ')}`,
      },
    );
};
