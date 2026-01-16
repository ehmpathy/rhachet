import { DomainLiteral } from 'domain-objects';
import type { IsoDuration } from 'iso-time';

import { BrainHookFilter } from './BrainHookFilter';

/**
 * .what = a single hook declared by a role
 * .why = author is derived on application from registry + role context
 *
 * .note = timeout format: ISO 8601 duration (e.g., "PT60S", "PT5M")
 */
export interface RoleHookOnBrain {
  command: string;
  timeout: IsoDuration;
  filter?: BrainHookFilter;
}

export class RoleHookOnBrain
  extends DomainLiteral<RoleHookOnBrain>
  implements RoleHookOnBrain
{
  public static nested = {
    filter: BrainHookFilter,
  };
}
