import type { ContextCli } from '@src/domain.objects/ContextCli';
import type { RoleSpecifier } from '@src/domain.objects/RoleSpecifier';
import { getRolesFoundFromSlugs } from '@src/domain.operations/init/roles/link/getRolesFoundFromSlugs';
import { getRolesLinkedFromFound } from '@src/domain.operations/init/roles/link/getRolesLinkedFromFound';
import { getRolesUnlinkedFromSlugs } from '@src/domain.operations/init/roles/link/getRolesUnlinkedFromSlugs';
import { discoverLinkedRoles } from '@src/domain.operations/upgrade/discoverLinkedRoles';

import { getRolesIncrementalSummaryTree } from './getRolesIncrementalSummaryTree';
import { getRolesNewlyEnrolled } from './getRolesNewlyEnrolled';
import { getUntouchedRoles } from './getUntouchedRoles';

/**
 * .what = sets the enrolled role set by an incremental `+addition -subtraction` delta
 * .why = enables adjust-relative-to-current-set without a full respecify
 *
 * .note = the summary tree prints as a header first (before the per-role `📚 link
 *   role` trees), so the delta reads top-down: what changed, then the link work.
 *   this splits the add-path into a lookup step (getRolesFoundFromSlugs, which
 *   computes the delta) and a link step (getRolesLinkedFromFound, the shared
 *   source of truth the absolute path also uses) — the same split the absolute
 *   path uses to print its header before the link trees.
 * .note = subtractions unlink first (getRolesUnlinkedFromSlugs guards ambiguity +
 *   native roles — a `-absent` is a no-op) and emit no tree of their own
 * .note = additions and subtractions are validated non-contradictory upstream (getRoleDeltas)
 * .note = returns the applied set (rolesAdded, rolesRemoved) declared inline — a
 *   report shape, not a domain contract, per rule.forbid.io-as-interfaces
 */
export const setIncrementalRoles = async (
  input: { additions: RoleSpecifier[]; subtractions: RoleSpecifier[] },
  context: ContextCli,
): Promise<{
  rolesAdded: { repo: string; role: string }[];
  rolesRemoved: { repo: string; role: string }[];
}> => {
  // capture the linked set before, to tell newly-enrolled from already-present
  const linkedBefore = discoverLinkedRoles({}, context);

  // look up the additions against the installed packages (no link yet)
  // .note = packageErrors are ignored here — an incremental `+role` links its
  //   role from a valid package or fail-fasts on unknown; the broken-package
  //   report is the absolute path's concern
  const { found } = await getRolesFoundFromSlugs(
    { slugs: input.additions },
    context,
  );

  // remove phase: unlink each subtraction, report only the roles actually removed
  const rolesRemoved = getRolesUnlinkedFromSlugs(
    { slugs: input.subtractions },
    context,
  );

  // additions = only the found roles that were absent before — a re-link is not an add
  const rolesAdded = getRolesNewlyEnrolled({
    candidates: found.map((one) => ({
      repo: one.repo.slug,
      role: one.role.slug,
    })),
    linkedBefore,
  });

  // untouched = the post-removal linked set minus the roles we are about to add
  const untouched = getUntouchedRoles({
    linkedRoles: discoverLinkedRoles({}, context),
    rolesAdded,
  });

  // print the summary tree header: additions / subtractions subtrees + untouched count
  console.log('');
  console.log(
    getRolesIncrementalSummaryTree({
      additions: rolesAdded,
      subtractions: rolesRemoved,
      untouchedCount: untouched.length,
    }),
  );
  console.log('');

  // link + init the additions last (prints the per-role `📚 link role` trees)
  await getRolesLinkedFromFound({ found }, context);

  return { rolesAdded, rolesRemoved };
};
