import type { ContextCli } from '@src/domain.objects/ContextCli';
import type { RoleManifest } from '@src/domain.objects/RoleManifest';
import type { RoleRegistryManifest } from '@src/domain.objects/RoleRegistryManifest';
import type { RoleSpecifier } from '@src/domain.objects/RoleSpecifier';
import { execRoleInits } from '@src/domain.operations/invoke/init/execRoleInits';
import { execRoleLink } from '@src/domain.operations/invoke/link/execRoleLink';

import { withRolesPartWayFault } from './withRolesPartWayFault';

/**
 * .what = links + inits a set of already-found roles (the source of truth link loop)
 * .why = both the absolute path (initRolesFromPackages) and the incremental
 *        add-path (setIncrementalRoles) enroll roles the same way once the slugs
 *        are found — link + init each. this is that one shared link behavior.
 *
 * .note = prints the per-role `📚 link role` tree (via execRoleLink); the caller
 *   owns any header/footer/summary output around it
 * .note = link is findsert-idempotent and execRoleInits is idempotent, so a
 *   re-linked role is a safe no-op and a mid-sequence retry recovers cleanly
 * .note = returns every linked role's concrete { repo, role } slugs
 */
export const getRolesLinkedFromFound = async (
  input: {
    found: {
      specifier: RoleSpecifier;
      repo: RoleRegistryManifest;
      role: RoleManifest;
    }[];
  },
  context: ContextCli,
): Promise<{ repo: string; role: string }[]> => {
  // the concrete { repo, role } of each found role, in loop order
  const slugs = asRoleSlugsOfFound({ found: input.found });

  // link + init each role (sequential for deterministic, readable output); the first fault
  //   stops the loop (F5) and names which roles linked
  for (const [faultAt, one] of input.found.entries()) {
    // link the role; a link fault leaves this role unlinked
    await withRolesPartWayFault({ slugs, faultAt, step: 'link' }, () =>
      execRoleLink({ role: one.role, repo: one.repo }, context),
    );

    // init the role; an init fault leaves this role linked (F1)
    await withRolesPartWayFault({ slugs, faultAt, step: 'init' }, () =>
      execRoleInits({ role: one.role, repo: one.repo }),
    );
  }

  // report the concrete { repo, role } of each linked role
  return slugs;
};

/**
 * .what = the concrete { repo, role } slugs of each found role, in loop order
 */
const asRoleSlugsOfFound = (input: {
  found: { repo: RoleRegistryManifest; role: RoleManifest }[];
}): { repo: string; role: string }[] =>
  input.found.map((one) => ({ repo: one.repo.slug, role: one.role.slug }));
