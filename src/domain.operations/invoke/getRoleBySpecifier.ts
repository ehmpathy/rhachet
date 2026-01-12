import { BadRequestError } from 'helpful-errors';

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
      const registries = (await context.config.usage.get.registries.explicit())
        .registries;
      if (registries.length === 0) {
        BadRequestError.throw('No registries found in rhachet.use.ts');
      }
      return registries;
    }

    // implicit discovery
    console.log(``);
    console.log(`🔭 No rhachet.use.ts found, discover from packages...`);
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
      BadRequestError.throw(
        'No role packages found. Ensure rhachet-roles-* packages are installed and have rhachet.repo.yml',
      );
    }
    return implicit.manifests;
  })();

  // resolve role from registries
  return getRoleFromManifests({ specifier, manifests: registries });
};
