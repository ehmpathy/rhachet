import type { RoleDelta } from '@src/domain.objects/RoleDelta';
import { asRoleFocusMap } from '@src/domain.operations/roles/focus/asRoleFocusMap';
import { asRoleFocusParts } from '@src/domain.operations/roles/focus/asRoleFocusParts';
import { parseRoleSpecifier } from '@src/domain.operations/roles/parseRoleSpecifier';

/**
 * .what = the ambient role foci after an `rhx init --roles` delta
 * .why = the record follows the links. an init links each role it names and unlinks only a
 *        `-` role, so each named role takes its new focus (or widens), a `-` role drops its
 *        entry, and a role the delta does not name keeps its focus — it stays linked
 *
 * .note = an exact set on init links, never unlinks; to clear the foci of the roles it omits
 *         would widen a role the human never named (i005 r011 point 1)
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

  // drop every role the delta names, then record the focus of each role it links
  const linked = input.deltas.filter((delta) => delta.kind !== 'subtraction');
  const rolesNamed = new Set(input.deltas.map((delta) => asSlugOf(delta.role)));
  const fociKept = Object.fromEntries(
    Object.entries(input.fociPrior).filter(([role]) => !rolesNamed.has(role)),
  );
  return { ...fociKept, ...asFociOf(linked.map((delta) => delta.role)) };
};
