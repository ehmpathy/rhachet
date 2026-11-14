import type { RoleBootSpec } from '@src/domain.objects/RoleBootSpec';
import type { RoleModSpec } from '@src/domain.objects/RoleModSpec';

import { asRoleModRefusalError } from './asRoleModRefusalError';

/**
 * .what = refuses a mod whose boot.yml mode differs from its role's
 * .why = one mode per merge keeps first-say-wins as it is; a simple spec's absent `say`
 *        means "say all", which has no faithful `always:` form (F12)
 *
 * .note = a role with no boot.yml says all, which is simple mode, so it takes a simple mod
 * .note = a mod with no section matches any role — it only shadows
 * .note = a subject mod may name only the subjects its role declares; any other would
 *   carry briefs into a section no boot of the role can select
 */
export const assertRoleModModeMatchesRole = (input: {
  mod: RoleModSpec;
  role: RoleBootSpec | null;
}): void => {
  const modSections = input.mod.sections;
  if (!modSections) return;

  const modeRole = input.role?.mode ?? 'simple';
  if (modSections.mode !== modeRole)
    throw asRoleModRefusalError({
      role: input.mod.of.role,
      problem: `its boot.yml is in ${modSections.mode} mode, but the role's is in ${modeRole} mode`,
      subject: 'boot.yml',
      nearest: null,
      fix:
        modeRole === 'simple'
          ? 'write the mod with top-level `briefs:` / `skills:`, as the role does'
          : 'write the mod with `always:` / `subject.<slug>:` sections, as the role does',
    });

  // a subject mod names only the role's subjects
  if (modSections.mode !== 'subject' || input.role?.mode !== 'subject') return;
  const subjectsRole = Object.keys(input.role.subjects);
  const subjectsUnknown = Object.keys(modSections.subjects).filter(
    (slug) => !subjectsRole.includes(slug),
  );
  if (subjectsUnknown.length > 0)
    throw asRoleModRefusalError({
      role: input.mod.of.role,
      problem: `its boot.yml names a subject the role does not declare (${subjectsUnknown.join(', ')})`,
      subject: 'boot.yml',
      nearest: subjectsRole.length > 0 ? subjectsRole.join(', ') : null,
      fix: 'name one of the role subjects, or put the resources under `always:`',
    });
};
