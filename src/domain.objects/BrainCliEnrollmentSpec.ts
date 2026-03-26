import { DomainLiteral } from 'domain-objects';

import { BrainCliEnrollmentOperation } from './BrainCliEnrollmentOperation';

/**
 * .what = parsed representation of the --roles flag value for brain CLI enrollment
 * .why = enables validation and manipulation of enrollment operations
 */
export interface BrainCliEnrollmentSpec {
  /**
   * .what = mode of application
   * .why = "replace" replaces defaults entirely, "delta" modifies defaults via ops
   */
  mode: 'replace' | 'delta';

  /**
   * .what = ordered list of operations to apply
   */
  ops: BrainCliEnrollmentOperation[];
}

export class BrainCliEnrollmentSpec
  extends DomainLiteral<BrainCliEnrollmentSpec>
  implements BrainCliEnrollmentSpec
{
  public static nested = {
    ops: BrainCliEnrollmentOperation,
  };
}
