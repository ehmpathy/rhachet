import { BadRequestError } from 'helpful-errors';

import type { ContextCli } from '@src/domain.objects/ContextCli';
import type { RoleManifest } from '@src/domain.objects/RoleManifest';
import type { RoleRegistryManifest } from '@src/domain.objects/RoleRegistryManifest';
import type { RoleSpecifier } from '@src/domain.objects/RoleSpecifier';
import { getRoleRegistriesByConfigImplicit } from '@src/domain.operations/config/getRoleRegistriesByConfigImplicit';
import { getRolesFromManifests } from '@src/domain.operations/manifest/getRolesFromManifests';

/**
 * .what = looks up a set of role slugs against the installed package manifests
 * .why = the lookup step both the absolute path (initRolesFromPackages) and the
 *        incremental add-path (setIncrementalRoles) share — separated from the
 *        link step so a caller can compute a summary from the found roles BEFORE
 *        the link work prints its per-role trees
 *
 * .note = pure lookup — no filesystem link, no console output
 * .note = fail-fast if no rhachet-roles-* packages are installed, and on
 *   unknown/ambiguous slugs (via getRolesFromManifests)
 * .note = also returns packageErrors (broken packages that lack a manifest) — a
 *   valid package alongside a broken one still yields its roles, so the caller
 *   can report the broken package and exit non-zero without a hard throw
 */
export const getRolesFoundFromSlugs = async (
  input: { slugs: RoleSpecifier[] },
  context: ContextCli,
): Promise<{
  found: {
    specifier: RoleSpecifier;
    repo: RoleRegistryManifest;
    role: RoleManifest;
  }[];
  packageErrors: { packageName: string; error: Error }[];
}> => {
  // no slugs → empty set
  if (input.slugs.length === 0) return { found: [], packageErrors: [] };

  // discover the installed role packages
  const { manifests, errors: packageErrors } =
    await getRoleRegistriesByConfigImplicit(context);

  // fail fast if no packages are installed at all
  if (manifests.length === 0 && packageErrors.length === 0)
    throw new BadRequestError(
      'no rhachet-roles-* packages found. install a package first.',
      { suggestion: 'npm install rhachet-roles-ehmpathy' },
    );

  // fail fast if every installed package lacks a rhachet.repo.yml manifest
  if (manifests.length === 0 && packageErrors.length > 0)
    throw new BadRequestError(
      `all rhachet-roles packages lack rhachet.repo.yml:\n${packageErrors
        .map((e) => `  - ${e.packageName}`)
        .join(
          '\n',
        )}\n\nrun \`rhachet repo introspect\` in those packages to generate the manifest.`,
    );

  // look up the slugs as concrete roles (fail-fast on unknown/ambiguous)
  const found = getRolesFromManifests({
    specifiers: input.slugs,
    manifests,
  });

  return { found, packageErrors };
};
