import type { ContextCli } from '@src/domain.objects/ContextCli';
import type { RoleSpecifier } from '@src/domain.objects/RoleSpecifier';
import { indentLines } from '@src/infra/indentLines';

import { getRolesFoundFromSlugs } from './getRolesFoundFromSlugs';
import { getRolesLinkedFromFound } from './getRolesLinkedFromFound';

/**
 * .what = result of the init roles operation
 * .why = provides a structured summary of what was linked/initialized
 */
export interface InitRolesResult {
  rolesLinked: { repo: string; role: string }[];
  rolesInitialized: { repo: string; role: string }[];
  errors: {
    phase: 'discover' | 'link' | 'init';
    specifier: RoleSpecifier;
    error: Error;
  }[];
}

/**
 * .what = initializes multiple roles from installed packages (absolute form)
 * .why = enables `rhachet init --roles mechanic behaver` — replace the whole set
 *
 * .note = the lookup + link work is delegated to the shared source of truth ops
 *   (getRolesFoundFromSlugs + getRolesLinkedFromFound), shared with the
 *   incremental `+role` path; this wrapper adds the absolute-form header/footer
 *   + broken-package report around them
 * .note = a broken package alongside a valid one is tolerated — its roles that
 *   come from the valid package still link, the broken package is reported, and
 *   the returned errors drive a non-zero exit (via invokeInit)
 */
export const initRolesFromPackages = async (
  input: { specifiers: RoleSpecifier[] },
  context: ContextCli,
): Promise<InitRolesResult> => {
  // look up the slugs against the installed packages (fail-fast, surfaces broken pkgs)
  const { found, packageErrors } = await getRolesFoundFromSlugs(
    { slugs: input.specifiers },
    context,
  );

  // header: announce how many roles we are about to init (before the link trees)
  console.log('');
  console.log(`🔧 init ${found.length} role(s)...`);
  console.log('');

  // report broken packages loud and proud (they lack a rhachet.repo.yml manifest)
  if (packageErrors.length > 0) {
    console.log(`⚠️  ${packageErrors.length} package(s) failed to load:`);
    for (const { packageName, error } of packageErrors)
      console.log(
        `   ⛈️ ${packageName}:\n${indentLines({ text: error.message, prefix: '      > ' })}`,
      );
    console.log('');
  }

  // link + init the found roles via the shared source of truth (prints 📚 trees)
  const linked = await getRolesLinkedFromFound({ found }, context);

  // footer: report the linked + initialized counts, and any package errors
  if (linked.length > 0) {
    console.log(`✨ ${linked.length} role(s) linked`);
    console.log(`✨ ${linked.length} role(s) initialized`);
  }
  if (packageErrors.length > 0)
    console.log(`⚠️  ${packageErrors.length} error(s) occurred`);
  console.log('');

  // shape the package errors as discover-phase errors so the caller can exit
  return {
    rolesLinked: linked,
    rolesInitialized: linked,
    errors: packageErrors.map(({ packageName, error }) => ({
      phase: 'discover' as const,
      specifier: packageName.replace('rhachet-roles-', ''),
      error,
    })),
  };
};
