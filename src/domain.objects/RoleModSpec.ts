import { DomainLiteral } from 'domain-objects';

import type { RoleBootSpec } from './RoleBootSpec';
import type { RoleModTarget } from './RoleModTarget';

/**
 * .what = a parsed mod `boot.yml` — the role's own schema, plus `of`, less `budget`
 * .why = the mod's sections are read before the role's, so the merge needs no rule of its
 *        own; the spec is a role spec in shape, and the target names whose it is
 *
 * .note = `sections: null` is a mod with no section at all — only shadows, which need no
 *   declaration. its mode then matches any role's
 * .note = the `budget` of `sections` is always null; a mod's budget key is refused at parse
 */
export interface RoleModSpec {
  of: RoleModTarget;
  sections: RoleBootSpec | null;
}
export class RoleModSpec
  extends DomainLiteral<RoleModSpec>
  implements RoleModSpec {}
