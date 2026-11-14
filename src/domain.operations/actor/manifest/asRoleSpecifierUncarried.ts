import type { RoleRegistryManifest } from '@src/domain.objects';
import { isRoleSpecifierMatch } from '@src/domain.operations/roles/isRoleSpecifierMatch';

/**
 * .what = the first role specifier that no installed role package carries, or null
 * .why = init under a manifest must refuse a declared role it cannot link BEFORE it writes,
 *        so a typo leaves `.agent/` untouched (case=7)
 *
 * .note = pure transformer — no i/o, deterministic
 */
export const asRoleSpecifierUncarried = (input: {
  specifiers: string[];
  manifests: RoleRegistryManifest[];
}): string | null =>
  input.specifiers.find(
    (specifier) =>
      !input.manifests.some((manifest) =>
        manifest.roles.some((role) =>
          isRoleSpecifierMatch({
            left: specifier,
            right: `${manifest.slug}/${role.slug}`,
          }),
        ),
      ),
  ) ?? null;
