import type { RoleRegistry } from '@src/domain.objects';

/**
 * .what = ensure we fail fast upon duplicate role.slugs across registries
 */
export const assureUniqueRoles = (registries: RoleRegistry[]): void => {
  const seen = new Map<string, string>(); // slug → registry.slug
  for (const registry of registries) {
    for (const role of registry.roles) {
      if (seen.has(role.slug)) {
        throw new Error(
          `❌ duplicate role.slug "${
            role.slug
          }" found in registries: "${seen.get(role.slug)}" and "${
            registry.slug
          }"`,
        );
      }
      seen.set(role.slug, registry.slug);
    }
  }
};
