import { DomainLiteral } from 'domain-objects';

import { RoleHooksOnBrain } from './RoleHooksOnBrain';
import type { RoleHooksOnDispatch } from './RoleHooksOnDispatch';

/**
 * .what = container for all hook types a role can declare
 * .why = separates dispatch hooks (rhachet middleware) from brain hooks (brain events)
 *
 * .note = onDispatch: middleware over rhachet dispatch actions (interface with callbacks)
 * .note = onBrain: hooks applied to brain repl configs (domain literal with data)
 */
export interface RoleHooks {
  onDispatch?: RoleHooksOnDispatch;
  onBrain?: RoleHooksOnBrain;
}

export class RoleHooks extends DomainLiteral<RoleHooks> implements RoleHooks {
  // note: onDispatch is not in nested because it contains callback functions
  // and cannot be automatically hydrated as a DomainLiteral
  public static nested = {
    onBrain: RoleHooksOnBrain,
  };
}
