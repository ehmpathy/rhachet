import { DomainEntity } from 'domain-objects';

import type { RoleManifest } from './RoleManifest';

/**
 * .what = resolved manifest for rhachet.repo.yml with absolute paths
 * .why = enables package-based role discovery without rhachet.use.ts
 *
 * .note = RoleRegistry is a superset of this type; RoleRegistry satisfies RoleRegistryManifest
 *
 * .note = manifest-based registries have limitations vs import-based:
 *   - only static path refs supported (resolved from yaml strings)
 *   - no in-memory Role object refs (no runtime logic)
 *   - all resource refs resolved to .agent/ symlinks
 *   - no dynamic skill/brief generation
 *
 * .note = this tradeoff enables:
 *   - bun binaries to read without JIT import
 *   - faster startup (no typescript transpile)
 *   - simpler package distribution
 */
export interface RoleRegistryManifest {
  /**
   * .what = unique identifier for this repo (e.g., "ehmpathy", "bhuild")
   * .note = matches the suffix of rhachet-roles-{slug} package name
   */
  slug: string;

  /**
   * .what = path to readme file, resolved to absolute path
   */
  readme: { uri: string };

  /**
   * .what = role definitions for this repo
   */
  roles: RoleManifest[];
}
export class RoleRegistryManifest
  extends DomainEntity<RoleRegistryManifest>
  implements RoleRegistryManifest
{
  public static unique = ['slug'] as const;
}
