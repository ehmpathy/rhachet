import { DomainLiteral } from 'domain-objects';

import type { RoleSpecifier } from './RoleSpecifier';

/**
 * .what = one signed change to the role set, parsed from a `--roles` token
 * .why = the ONE ubiquitous shape every `--roles` consumer speaks (init, enroll,
 *        upgrade). replaces the prior per-layer synonyms — the deltas-layer
 *        `{ kind, role }` classification AND enroll's per-op shape (`action:
 *        add|remove`). one grammar, one dobj — no divergence to drift.
 *
 * .note = `kind` names the sigil the token carried:
 *   - `addition`    ← `+role`  (delta add against the current/default set)
 *   - `subtraction` ← `-role`  (delta subtract against the current/default set)
 *   - `absolute`    ← bare `role` (a member of a replace-the-whole-set spec)
 * .note = `absolute` is not a sign — it marks replace mode, where the base set is
 *   empty and every member is added. a homogeneous list is either all-`absolute`
 *   (replace) or all-`addition`/`subtraction` (incremental); a mixed list is
 *   rejected upstream in `getRoleDeltas`.
 */
export interface RoleDelta {
  /**
   * .what = the sigil kind the source token carried
   */
  kind: 'addition' | 'subtraction' | 'absolute';

  /**
   * .what = the role this delta acts on (bare `role` or scoped `repo/role`)
   */
  role: RoleSpecifier;
}

export class RoleDelta extends DomainLiteral<RoleDelta> implements RoleDelta {}
