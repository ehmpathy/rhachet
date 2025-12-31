import { DomainLiteral } from 'domain-objects';

/**
 * .what = configuration plugs for BrainAtom instances
 * .why = enables extensible configuration for single-turn inference
 *   without coupling to specific SDK implementations
 *
 * .note = placeholder interface; actual configuration TBD
 */
export interface BrainAtomPlugs {
  /**
   * .what = structured output configuration
   * .why = enables native JSON schema enforcement for reduced token waste
   */
  output?: never; // todo: allow configuration
  // output?: { enforceSchema?: boolean };
}
export class BrainAtomPlugs
  extends DomainLiteral<BrainAtomPlugs>
  implements BrainAtomPlugs {}
