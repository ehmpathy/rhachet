import { DomainLiteral } from 'domain-objects';

import { RoleDelta } from './RoleDelta';

/**
 * .what = parsed representation of the --roles flag value for brain CLI enrollment
 * .why = enables validation and manipulation of the enrollment deltas
 *
 * .note = speaks the shared `--roles` vocabulary — `mode` matches the delta grammar
 *   (`absolute` = replace the whole set, `incremental` = patch the defaults), and
 *   `deltas` are RoleDelta instances, the one dobj every `--roles` consumer shares.
 */
export interface BrainCliEnrollmentSpec {
  /**
   * .what = mode of application
   * .why = "absolute" replaces defaults entirely, "incremental" patches defaults via deltas
   */
  mode: 'absolute' | 'incremental';

  /**
   * .what = ordered list of role deltas to apply
   */
  deltas: RoleDelta[];
}

export class BrainCliEnrollmentSpec
  extends DomainLiteral<BrainCliEnrollmentSpec>
  implements BrainCliEnrollmentSpec
{
  public static nested = {
    deltas: RoleDelta,
  };
}
