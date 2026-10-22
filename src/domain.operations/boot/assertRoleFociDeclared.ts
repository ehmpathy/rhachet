import type { RoleLinkRefAtFocus } from '@src/domain.objects/RoleLinkRefAtFocus';

import { assertRoleFocusDeclared } from './assertRoleFocusDeclared';
import { getOneRoleBootSpecFromRef } from './getOneRoleBootSpecFromRef';

/**
 * .what = refuses any focus a linked role does not declare, before any write
 * .why = enroll and init each name a roleset, then write an actor dir, a manifest, a
 *        `prepare:rhachet` entry. a focus that names no subject must halt before the first
 *        of those, so a typo leaves the repo as it found it
 *
 * .note = only a focused ref reads its spec; a whole role costs no read
 * .note = the render checks the same rule again (`getOneRoleBootContent`), so a subject a
 *         role upgrade drops halts the re-render of an extant actor too (U1)
 */
export const assertRoleFociDeclared = (input: {
  refs: RoleLinkRefAtFocus[];
  repoPath: string;
}): void =>
  input.refs
    .filter((ref) => ref.subjects !== null)
    .forEach((ref) =>
      assertRoleFocusDeclared({
        slugRole: ref.role,
        subjects: ref.subjects,
        config: getOneRoleBootSpecFromRef({ ref, repoPath: input.repoPath }),
      }),
    );
