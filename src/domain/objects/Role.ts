import { DomainEntity } from 'domain-objects';

import { RoleSkill } from './RoleSkill';
import { RoleTrait } from './RoleTrait';

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
  traits: RoleTrait<any>[];

  /**
   * .what = the skills known by the role
   * .why = declares what the role can do
   */
  skills: RoleSkill<any>[];
}
export class Role extends DomainEntity<Role> implements Role {
  public static unique = ['slug'] as const;
}
