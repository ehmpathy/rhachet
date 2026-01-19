import { BadRequestError } from 'helpful-errors';

import type { ContextCli } from '@src/domain.objects/ContextCli';
import type { RoleSpecifier } from '@src/domain.objects/RoleSpecifier';
import { execRoleInits } from '@src/domain.operations/invoke/init/execRoleInits';
import { execRoleLink } from '@src/domain.operations/invoke/link/execRoleLink';
import { indentLines } from '@src/infra/indentLines';

import { getRoleRegistriesByConfigImplicit } from '../config/getRoleRegistriesByConfigImplicit';
import { getRolesFromManifests } from '../manifest/getRolesFromManifests';

/**
 * .what = result of init roles operation
 * .why = provides structured summary of what was done
 */
export interface InitRolesResult {
  rolesLinked: { specifier: RoleSpecifier; repo: string; role: string }[];
  rolesInitialized: { specifier: RoleSpecifier; repo: string; role: string }[];
  errors: { specifier: RoleSpecifier; phase: 'link' | 'init'; error: Error }[];
}

/**
 * .what = initializes multiple roles from installed packages
 * .why = enables `npx rhachet init --roles mechanic behaver` workflow
 *
 * .note = uses getRolesFromManifests which fail-fast on first error
 */
export const initRolesFromPackages = async (
  input: { specifiers: RoleSpecifier[] },
  context: ContextCli,
): Promise<InitRolesResult> => {
  // discover manifests from packages
  const { manifests, errors: packageErrors } =
    await getRoleRegistriesByConfigImplicit(context);

  // fail fast if no packages found
  if (manifests.length === 0 && packageErrors.length === 0) {
    throw new BadRequestError(
      'no rhachet-roles-* packages found. install a package first.',
      {
        suggestion: 'npm install rhachet-roles-ehmpathy',
      },
    );
  }

  // fail if all packages lack manifests
  if (manifests.length === 0 && packageErrors.length > 0) {
    const packageList = packageErrors
      .map((e) => `  - ${e.packageName}`)
      .join('\n');
    throw new BadRequestError(
      `all rhachet-roles packages lack rhachet.repo.yml:\n${packageList}\n\nrun \`npx rhachet repo introspect\` in those packages to generate the manifest.`,
    );
  }

  // resolve all specifiers via getRolesFromManifests (fail-fast on first error)
  const roles = getRolesFromManifests({
    specifiers: input.specifiers,
    manifests,
  });

  // link and init each resolved role
  const result: InitRolesResult = {
    rolesLinked: [],
    rolesInitialized: [],
    errors: [],
  };

  console.log('');
  console.log(`🔧 init ${roles.length} role(s)...`);
  console.log('');

  for (const resolved of roles) {
    // link phase
    try {
      execRoleLink({ role: resolved.role, repo: resolved.repo }, context);
      result.rolesLinked.push({
        specifier: resolved.specifier,
        repo: resolved.repo.slug,
        role: resolved.role.slug,
      });
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      result.errors.push({
        specifier: resolved.specifier,
        phase: 'link',
        error,
      });
      console.log(
        `   ⛈️ link failed for ${resolved.repo.slug}/${resolved.role.slug}:\n${indentLines({ text: error.message, prefix: '      > ' })}`,
      );
      continue;
    }

    // init phase
    try {
      await execRoleInits({
        role: resolved.role,
        repo: resolved.repo,
      });
      result.rolesInitialized.push({
        specifier: resolved.specifier,
        repo: resolved.repo.slug,
        role: resolved.role.slug,
      });
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      result.errors.push({
        specifier: resolved.specifier,
        phase: 'init',
        error,
      });
      console.log(
        `   ⛈️ init failed for ${resolved.repo.slug}/${resolved.role.slug}:\n${indentLines({ text: error.message, prefix: '      > ' })}`,
      );
    }
  }

  // summary
  console.log('');
  if (result.rolesLinked.length > 0) {
    console.log(`✨ ${result.rolesLinked.length} role(s) linked`);
  }
  if (result.rolesInitialized.length > 0) {
    console.log(`✨ ${result.rolesInitialized.length} role(s) initialized`);
  }
  if (result.errors.length > 0) {
    console.log(`⚠️  ${result.errors.length} error(s) occurred`);
  }
  console.log('');

  return result;
};
