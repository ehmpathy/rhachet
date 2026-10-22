import type { RoleDelta } from '@src/domain.objects/RoleDelta';
import { asRoleFocusMap } from '@src/domain.operations/roles/focus/asRoleFocusMap';
import { asRoleFocusParts } from '@src/domain.operations/roles/focus/asRoleFocusParts';
import { parseRoleSpecifier } from '@src/domain.operations/roles/parseRoleSpecifier';

/**
 * .what = the ambient role foci after an `rhx init --roles` delta
 * .why = the ambient roleset follows the same rule an enroll does: an exact set replaces it
 *        whole, a `+` delta upserts its role's one entry, a `-` delta drops it (fulcrum F6)
 *
 * .note = the record keys by the bare role slug — a link is per slug, so a repo-qualified
 *         token (`ehmpathy/mechanic::flow`) records under `mechanic`
 * .note = a whole-role entry is absent from the record, never an empty list
 * .note = pure transformer — no i/o, deterministic
 */
export const asRepoAmbientRoleFociNext = (input: {
  fociPrior: Record<string, string[]>;
  deltas: RoleDelta[];
}): Record<string, string[]> => {
  const asSlugOf = (token: string): string =>
    parseRoleSpecifier({ specifier: asRoleFocusParts({ token }).role }).role;

  // the focused entries of a set of tokens, keyed by bare slug
  const asFociOf = (tokens: string[]): Record<string, string[]> =>
    Object.fromEntries(
      asRoleFocusMap({ tokens }).flatMap((entry) =>
        entry.subjects === null
          ? []
          : [[asSlugOf(entry.role), entry.subjects] as const],
      ),
    );

  // an exact set replaces the record whole
  const absolutes = input.deltas.filter((delta) => delta.kind === 'absolute');
  if (absolutes.length > 0)
    return asFociOf(absolutes.map((delta) => delta.role));

  // a delta drops every role it names, then records the focus of each addition
  const additions = input.deltas.filter((delta) => delta.kind === 'addition');
  const rolesNamed = new Set(input.deltas.map((delta) => asSlugOf(delta.role)));
  const fociKept = Object.fromEntries(
    Object.entries(input.fociPrior).filter(([role]) => !rolesNamed.has(role)),
  );
  return { ...fociKept, ...asFociOf(additions.map((delta) => delta.role)) };
};
