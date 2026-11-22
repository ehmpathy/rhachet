import { ConstraintError } from 'helpful-errors';

import type { RoleContentDefect } from '@src/domain.objects/RoleContentDefect';

import { getOneRoleBootContent } from './getOneRoleBootContent';

/**
 * .what = the content defects of one role, owned or linked, or none where its render refuses
 * .why = the stop and the roster must name exactly the defects a birth set aside, so each role
 *        is read through the birth's own render; one composition of every content check, for
 *        both scans
 *
 * .note = the render also runs identity checks (a mod that names a native role, a stale view).
 *   such a refusal is the boot's to raise, never the stop's or the roster's, so the scan sets
 *   it aside (F9). an allowlist: only a `ConstraintError` is set aside; a malfunction raises
 */
export const getOneRoleContentDefectsOrNone = async (input: {
  ref: { repo: string; role: string };
  cwd: string;
}): Promise<RoleContentDefect[]> => {
  try {
    const { defects } = await getOneRoleBootContent({
      slugRepo: input.ref.repo,
      slugRole: input.ref.role,
      subjects: null,
      cwd: input.cwd,
    });
    return defects;
  } catch (error) {
    if (!(error instanceof ConstraintError)) throw error;
    return [];
  }
};
