import { DomainLiteral } from 'domain-objects';

import { RoleHookOnBrain } from './RoleHookOnBrain';

/**
 * .what = container for hook declarations by event type
 * .why = separates hooks by lifecycle moment (boot, tool use, stop)
 */
export interface RoleHooksOnBrain {
  onBoot?: RoleHookOnBrain[];
  onTool?: RoleHookOnBrain[];
  onStop?: RoleHookOnBrain[];
}

export class RoleHooksOnBrain
  extends DomainLiteral<RoleHooksOnBrain>
  implements RoleHooksOnBrain
{
  public static nested = {
    onBoot: RoleHookOnBrain,
    onTool: RoleHookOnBrain,
    onStop: RoleHookOnBrain,
  };
}
