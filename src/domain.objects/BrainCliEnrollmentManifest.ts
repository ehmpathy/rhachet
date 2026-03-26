import { DomainLiteral } from 'domain-objects';

import type { BrainSlug } from './BrainSlug';
import type { RoleSlug } from './RoleSlug';

/**
 * .what = the final manifest of what to enroll
 * .why = specifies the brain and computed roles for enrollment
 */
export interface BrainCliEnrollmentManifest {
  /**
   * .what = the brain to enroll (e.g., "claude")
   */
  brain: BrainSlug;

  /**
   * .what = ordered list of role slugs to enroll
   */
  roles: RoleSlug[];
}

export class BrainCliEnrollmentManifest
  extends DomainLiteral<BrainCliEnrollmentManifest>
  implements BrainCliEnrollmentManifest {}
