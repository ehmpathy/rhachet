import { DomainEntity } from 'domain-objects';

/**
 * .what = type for a single role within the manifest with resolved paths
 * .why = enables type-safe role configuration that Role can satisfy
 *
 * .note = Role is a superset of this type; Role satisfies RoleManifest
 */
export interface RoleManifest {
  slug: string;
  readme: { uri: string };
  briefs: { dirs: { uri: string } | { uri: string }[] };
  skills: { dirs: { uri: string } | { uri: string }[] };
  inits?: {
    dirs?: { uri: string } | { uri: string }[];
    exec?: { cmd: string }[];
  };
}
export class RoleManifest
  extends DomainEntity<RoleManifest>
  implements RoleManifest
{
  public static unique = ['slug'] as const;
}
