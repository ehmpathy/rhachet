import { DomainEntity } from 'domain-objects';
import { Serializable } from 'serde-fns';

import { Template } from './Template';

/**
 * .what = a trait is a reusable behavioral modifier for a role
 *   - it's adopted as an inherent truth of any actor which assumes the role
 *   - defines the default mindset or behavioral axioms leveraged by the role
 * .why =
 *   - helps cluster similar role behaviors (e.g. “asksQuestions”, “retriesUntilSolved”)
 *   - enables composable role design
 * .examples =
 *   - treat ubiquitous language as top priority
 *   - treat consistency as top priority
 *   - prefer given/when/then test suites
 */
export interface RoleTrait<TVariables extends Serializable> {
  /**
   * .what = short identifier for this trait
   * .example = "asksQuestions"
   */
  slug: string;

  /**
   * .what = what this trait describes
   * .example = "asks clarifying questions before responding"
   */
  readme: string;

  /**
   * .what = the brief that houses this trait's declaration
   */
  brief: Template<TVariables>;
}
export class RoleTrait<TVariables extends Serializable>
  extends DomainEntity<RoleTrait<TVariables>>
  implements RoleTrait<TVariables>
{
  public static unique = ['slug'] as const;
}
