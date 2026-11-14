import { DomainLiteral } from 'domain-objects';

import type { BrainSlug } from './BrainSlug';

/**
 * .what = one actor as a repo or a role package declares it, in an `actors.yml` entry
 * .why = the declared form is what a human writes; it may name a base and deltas, and may
 *        omit its brain. the expander turns it into a concrete `{ brain, roles }`
 *
 * .note = `roles` holds the entries as written: concrete roles (`repo/role` or a bare slug),
 *         or one base (`@<slug>` local, `@<repo>/<slug>` published) then `+role` / `-role`
 *         deltas. never both — the validator refuses a mix (S6)
 */
export interface ActorDeclared {
  /**
   * .what = the actor's name — how it is addressed (`@<slug>`)
   * .example = 'builder', 'scholar'
   */
  slug: string;

  /**
   * .what = the brain this actor enrolls
   * .note = null where the actor extends a base: the base's brain propagates up (F11, S8).
   *         an actor with no base must state it, and the validator refuses one that reaches
   *         no brain after expansion
   */
  brain: BrainSlug | null;

  /**
   * .what = the role entries, as written
   * .example = ['@ehmpathy/builder', '+bhrowser/playwright']
   */
  roles: string[];
}

export class ActorDeclared
  extends DomainLiteral<ActorDeclared>
  implements ActorDeclared {}
