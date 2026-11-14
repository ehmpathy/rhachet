import type { ContextCli } from '@src/domain.objects/ContextCli';
import type { RoleSpecifier } from '@src/domain.objects/RoleSpecifier';
import { execRolesUnlink } from '@src/domain.operations/invoke/link/execRolesUnlink';
import { discoverLinkedRoles } from '@src/domain.operations/role/discoverLinkedRoles';
import { getNativeRoleSlugs } from '@src/domain.operations/role/getNativeRoleSlugs';
import { withRoleViewLock } from '@src/domain.operations/role/withRoleViewLock';

import { getRemovalTargets } from './getRemovalTargets';

/**
 * .what = the source of truth for "unlink a set of role slugs"
 * .why = the incremental remove-path (setIncrementalRoles, the subtractions)
 *        unenrolls roles by removal of their symlink tree. the linked-set lookup,
 *        ambiguity guard, and unlink live here, not inline in the orchestrator.
 *
 * .note = symmetric pair with getRolesLinkedFromSlugs (the add side)
 * .note = removal reads the linked set (getRemovalTargets guards repo-ambiguity
 *   and native roles); a slug not linked yields no target, a silent no-op
 * .note = execRolesUnlink is idempotent — an already-absent target drops out, so
 *   the returned set reports only the real removals
 * .note = the unlink holds the role view lock, as the link and the modded view sync do, so a
 *   removal never lands within a view swap of another `rhx` process
 */
export const getRolesUnlinkedFromSlugs = async (
  input: { slugs: RoleSpecifier[] },
  context: ContextCli,
): Promise<{ repo: string; role: string }[]> => {
  // no slugs → empty set
  if (input.slugs.length === 0) return [];

  // map the slugs to concrete unlink targets (fail-fast ambiguous/native)
  const targets = getRemovalTargets({
    removes: input.slugs,
    linkedRoles: discoverLinkedRoles({}, context),
    nativeRoles: getNativeRoleSlugs({}, context),
  });

  // unlink each target under the role view lock; execRolesUnlink returns only those present
  return withRoleViewLock({ cwd: context.cwd }, async () =>
    execRolesUnlink({ targets }, context),
  );
};
