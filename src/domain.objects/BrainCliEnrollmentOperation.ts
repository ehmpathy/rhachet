import { DomainLiteral } from 'domain-objects';

import type { RoleSlug } from './RoleSlug';

/**
 * .what = a single role operation within an enrollment spec
 * .why = represents add/remove action for a specific role
 */
export interface BrainCliEnrollmentOperation {
  /**
   * .what = action to perform
   * .why = "add" includes the role, "remove" excludes it
   */
  action: 'add' | 'remove';

  /**
   * .what = the role slug (e.g., "mechanic", "driver")
   */
  role: RoleSlug;
}

export class BrainCliEnrollmentOperation
  extends DomainLiteral<BrainCliEnrollmentOperation>
  implements BrainCliEnrollmentOperation {}
