import { ConstraintError } from 'helpful-errors';

import type { ActorsManifest } from '@src/domain.objects/ActorsManifest';
import type { ContextCli } from '@src/domain.objects/ContextCli';
import { getRoleRegistriesByConfigImplicit } from '@src/domain.operations/config/getRoleRegistriesByConfigImplicit';
import { getAllNamesWithinEditDistance } from '@src/utils/getAllNamesWithinEditDistance';

import { asRoleSpecifiersToLink } from './asRoleSpecifiersToLink';
import { asRoleSpecifierUncarried } from './asRoleSpecifierUncarried';
import { genGetPublishedActorOfPackages } from './genGetPublishedActorOfPackages';
import { getActorsRoleUnion } from './getActorsRoleUnion';
import { getRolePackageOfRepo } from './getRolePackageOfRepo';

/**
 * .what = what `rhachet init` links under `.agent/actors.yml`: the union of every declared
 *         actor's roles
 * .why = under a manifest init reads its roles from the manifest rather than a `--roles` list
 *        (F6). the manifest owns WHAT is declared; the link itself stays with the init caller,
 *        which already owns the link path for `--roles`
 *
 * .note = every actor expands here, so an invalid base, cycle or brainless actor fails fast,
 *         before any link is written (case=7)
 * .note = the plan only reads. the convergence and its report run after the link
 *         (`setActorsManifestConverged`), so the report names what is, never what is planned
 */
export const getActorsManifestLinkPlan = async (
  input: { manifest: ActorsManifest },
  context: ContextCli,
): Promise<{
  roleSpecifiers: string[];
  declared: { role: string; via: string | null }[];
  warnings: string[];
}> => {
  // expand every actor over the installed packages
  const { manifests, errors } =
    await getRoleRegistriesByConfigImplicit(context);
  const union = getActorsRoleUnion(
    { manifest: input.manifest },
    {
      getPublishedActor: genGetPublishedActorOfPackages({
        manifests,
        failures: errors,
      }),
    },
  );

  // every declared role must be carried by an installed package, checked before any write
  const roleSpecifiers = asRoleSpecifiersToLink({ union: union.roles });
  const roleUncarried = asRoleSpecifierUncarried({
    specifiers: roleSpecifiers,
    manifests,
  });
  // its own package is installed, yet carries it no more: the package dropped or renamed it
  const packageOfRole = roleUncarried
    ? getRolePackageOfRepo({ specifier: roleUncarried, manifests })
    : null;
  const roleNearest = roleUncarried
    ? (getAllNamesWithinEditDistance({
        names: packageOfRole?.roles ?? [],
        nameTyped: roleUncarried,
      })[0] ?? null)
    : null;
  if (roleUncarried && packageOfRole)
    throw new ConstraintError(
      `actors.yml declares role '${roleUncarried}', which ${packageOfRole.name}@${packageOfRole.version} does not carry`,
      {
        role: roleUncarried,
        package: `${packageOfRole.name}@${packageOfRole.version}`,
        roles: packageOfRole.roles,
        hint: roleNearest
          ? `did you mean '${roleNearest}'? else that version dropped or renamed it: rename it in .agent/actors.yml, drop it, or pin a version of ${packageOfRole.name} that carries it`
          : `check the slug for a typo against \`roles\`, the ones this version carries. else that version dropped or renamed it: rename it in .agent/actors.yml, drop it, or pin a version of ${packageOfRole.name} that carries it`,
      },
    );

  // no installed package claims it: a typo, or a package not installed. a role reached through
  //   a published base is named with that base, since actors.yml never lists it itself
  const viaOfUncarried = roleUncarried
    ? (union.roles.find((one) => one.role === roleUncarried)?.via ?? null)
    : null;
  const packageOfUncarried = roleUncarried?.includes('/')
    ? `rhachet-roles-${roleUncarried.split('/')[0]}`
    : null;
  if (roleUncarried)
    throw new ConstraintError(
      viaOfUncarried
        ? `actors.yml extends ${viaOfUncarried}, whose role '${roleUncarried}' no installed role package carries`
        : `actors.yml declares role '${roleUncarried}', which no installed role package carries`,
      {
        role: roleUncarried,
        ...(viaOfUncarried ? { via: viaOfUncarried } : {}),
        packages: manifests.map((one) => one.slug),
        ...(errors.length
          ? { packagesUnread: errors.map((one) => one.packageName) }
          : {}),
        hint: packageOfUncarried
          ? `install ${packageOfUncarried}${viaOfUncarried ? `, which ${viaOfUncarried} needs` : ''}, or check the role slug for a typo`
          : 'check the role slug for a typo, or install the role package that carries it',
      },
    );

  // the roles to link: the union, save the native ones
  return { roleSpecifiers, declared: union.roles, warnings: union.warnings };
};
