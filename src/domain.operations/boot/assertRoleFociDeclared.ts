import type { RoleLinkRefAtFocus } from '@src/domain.objects/RoleLinkRefAtFocus';
import { getOneRoleBootSpecOrDefectFromRef } from '@src/domain.operations/role/getOneRoleBootSpecOrDefectFromRef';
import { isRoleSpecifierMatch } from '@src/domain.operations/roles/isRoleSpecifierMatch';

import { assertRoleFocusDeclared } from './assertRoleFocusDeclared';

/**
 * .what = refuses any focus a linked role does not declare, before any write
 * .why = enroll and init each name a roleset, then write an actor dir, a manifest, a
 *        `prepare:rhachet` entry. a focus that names no subject must halt before the first
 *        of those, so a typo leaves the repo as it found it
 *
 * .note = only a focused ref reads its spec; a whole role costs no read
 * .note = the spec is read through the render's own lenient reader, once. a spec that will not
 *         parse is content: the render ignores the focus, renders the role whole, and names the
 *         defect (`rule.forbid.content-checks-that-halt-enroll`), so it is skipped here
 * .note = a focus the caller typed gets the typo hint; a focus it inherited from the ambient
 *         record (a bare enroll, a `-driver`) gets the recorded hint — the caller never typed
 *         it, so the fix is the record, never a new focus on this enroll
 * .note = the render checks the same rule again (`getOneRoleBootContent`), so a subject a
 *         role upgrade drops halts the re-render of an extant actor too (U1)
 */
export const assertRoleFociDeclared = (input: {
  refs: RoleLinkRefAtFocus[];
  rolesFocusTyped: string[];
  repoPath: string;
}): void =>
  input.refs
    .filter((ref) => ref.subjects !== null)
    .forEach((ref) => {
      const { spec, defect } = getOneRoleBootSpecOrDefectFromRef({
        ref,
        repoPath: input.repoPath,
      });
      if (defect) return;
      assertRoleFocusDeclared({
        slugRole: ref.role,
        subjects: ref.subjects,
        config: spec,
        focusFrom: input.rolesFocusTyped.some((role) =>
          isRoleSpecifierMatch({ left: role, right: ref.role }),
        )
          ? 'typed'
          : 'recorded',
      });
    });
