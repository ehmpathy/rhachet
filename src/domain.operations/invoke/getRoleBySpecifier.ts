import { ConstraintError } from 'helpful-errors';

import type { RoleManifest } from '@src/domain.objects/RoleManifest';
import type { RoleRegistryManifest } from '@src/domain.objects/RoleRegistryManifest';
import type { ContextConfigOfUsage } from '@src/domain.operations/config/ContextConfigOfUsage';
import { getRoleFromManifests } from '@src/domain.operations/manifest/getRoleFromManifests';

/**
 * .what = resolves a role by specifier from either explicit or implicit config
 * .why = unified lookup for link/init operations
 *
 * .note = prefer explicit config (rhachet.use.ts), fallback to implicit (package discovery)
 * .note = Role satisfies RoleManifest; RoleRegistry satisfies RoleRegistryManifest
 */
export const getRoleBySpecifier = async (
  input: {
    role: string;
    repo?: string;
  },
  context: ContextConfigOfUsage,
): Promise<{ role: RoleManifest; repo: RoleRegistryManifest }> => {
  // build specifier string
  const specifier = input.repo ? `${input.repo}/${input.role}` : input.role;

  // get registries from explicit or implicit config
  const isExplicit = context.config.usage.isExplicit();
  const registries: RoleRegistryManifest[] = await (async () => {
    if (isExplicit) {
      console.log(``);
      console.log(`🔭 rhachet.use.ts found, import roles from config...`);
      // 🔴 NO catch-log-rethrow here. the rethrow reaches `emitCliErrorAndExit`, which is the
      //   one owner of what a human reads off a cli error — a preview logged beside it
      //   renders the same failure twice, to stdout, with no class name.
      const registries = (await context.config.usage.get.registries.explicit())
        .registries;
      if (registries.length === 0)
        ConstraintError.throw('No registries found in rhachet.use.ts', {
          from: 'rhachet.use.ts',
          why: 'the config was imported and read, and it declared no registry to boot a role from',
          hint: 'declare at least one registry in rhachet.use.ts, or delete the file to fall back to package discovery',
        });
      return registries;
    }

    // implicit discovery
    console.log(``);
    console.log(`🔭 discover roles from packages...`);
    const implicit = await context.config.usage.get.registries.implicit();

    // warn about packages that lack rhachet.repo.yml
    if (implicit.errors.length > 0) {
      console.log(``);
      console.log(`⚠️  Some packages lack rhachet.repo.yml:`);
      for (const err of implicit.errors) {
        console.log(`   - ${err.packageName}`);
      }
    }

    // fail fast if no manifests
    if (implicit.manifests.length === 0) {
      ConstraintError.throw(
        'No role packages found. Ensure rhachet-roles-* packages are installed and have rhachet.repo.yml',
      );
    }
    return implicit.manifests;
  })();

  // resolve role from registries
  return getRoleFromManifests({ specifier, manifests: registries });
};
