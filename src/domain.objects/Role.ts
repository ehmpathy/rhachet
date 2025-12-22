import { DomainEntity } from 'domain-objects';

import type { RoleSkill } from './RoleSkill';
import type { RoleTrait } from './RoleTrait';

/**
 * .what = defines a role that can have traits, know skills, and be instantiated across thread.context
 * .why =
 *   - enables registration of usable roles (e.g., 'mechanic', 'designer', 'architect', 'ecologist')
 *   - enables instantiation of thread.contexts
 */
export interface Role {
  /**
   * .what = a unique, readable identifier
   * .example = "mechanic"
   */
  slug: string; // short identifier, e.g., "caller"

  /**
   * .what = a display name for the role
   * .example = "Mechanic"
   */
  name: string;

  /**
   * .what = a brief on why this role exists
   * .why =
   *   - explain when and for what it should be used
   *   - sets what you can expect from it
   */
  purpose: string;

  /**
   * .what = a readme that explains more about the role
   * .why =
   *   - give detail about what it does and how it does it
   */
  readme: string;

  /**
   * .what = the traits inherent to the role
   * .why = declares how the role goes about things
   */
  traits: RoleTrait[];

  /**
   * .what = the skills known by the role
   * .why = declares what the role can do
   * .how =
   *   - dirs: directory-based skills (e.g., .sh scripts) for linking/booting
   *     - single { uri: string }: symlinks this dir as the full skills dir
   *     - array { uri: string }[]: symlinks each dir within the skills dir
   *   - refs: programmatic RoleSkill references for execution
   */
  skills: {
    dirs: { uri: string } | { uri: string }[];
    refs: RoleSkill<any>[];
  };

  /**
   * .what = the briefs curated for this role
   * .why = declares the library of knowledge this role can and should leverage
   *   - enables reuse of the briefs, independent from the skills
   * .how =
   *   - dirs: directory-based briefs for linking/booting
   *     - single { uri: string }: symlinks this dir as the full briefs dir
   *     - array { uri: string }[]: symlinks each dir within the briefs dir
   */
  briefs: { dirs: { uri: string } | { uri: string }[] };
}
export class Role extends DomainEntity<Role> implements Role {
  public static unique = ['slug'] as const;
}
