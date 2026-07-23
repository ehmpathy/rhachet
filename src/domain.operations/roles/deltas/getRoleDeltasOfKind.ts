import type { RoleDelta } from '@src/domain.objects/RoleDelta';
import type { RoleSpecifier } from '@src/domain.objects/RoleSpecifier';

/**
 * .what = the role specifiers of the deltas that match a given kind, in order
 * .why = consumers act on plain role slugs per kind — the replace path wants the
 *        `absolute` roles, the incremental path wants `addition` vs `subtraction`
 *        roles. this keeps those orchestrators narrative (no inline filter+map).
 *
 * .note = pure transformer — no i/o, deterministic.
 */
export const getRoleDeltasOfKind = (input: {
  deltas: RoleDelta[];
  kind: RoleDelta['kind'];
}): RoleSpecifier[] =>
  input.deltas
    .filter((delta) => delta.kind === input.kind)
    .map((delta) => delta.role);
