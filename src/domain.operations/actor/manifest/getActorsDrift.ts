import { isRoleSpecifierMatch } from '@src/domain.operations/roles/isRoleSpecifierMatch';

/**
 * .what = the drift between the roles `actors.yml` declares and the roles `.agent/` links
 */
export interface ActorsDrift {
  /**
   * .what = declared roles not linked — init restores them
   */
  short: { role: string; via: string | null }[];

  /**
   * .what = linked roles not declared — init keeps them, and names them (F4)
   */
  extra: string[];
}

/**
 * .what = compute declared vs linked, by role match
 * .why = every manifest-driven init reports its drift first, so a change is never silent
 *
 * .note = a bare declared slug (`supervisor`) matches a linked `repo/supervisor`, per the
 *         one rule every role comparison shares (`isRoleSpecifierMatch`)
 * .note = `via` names the declared source of each role (`@ehmpathy/builder`), or null where an
 *         actor lists it itself (A5)
 */
export const getActorsDrift = (input: {
  declared: { role: string; via: string | null }[];
  linked: string[];
}): ActorsDrift => {
  // declared roles that no linked role matches
  const short = input.declared.filter(
    (one) =>
      !input.linked.some((role) =>
        isRoleSpecifierMatch({ left: role, right: one.role }),
      ),
  );

  // linked roles that no declared role matches
  const extra = input.linked.filter(
    (role) =>
      !input.declared.some((one) =>
        isRoleSpecifierMatch({ left: role, right: one.role }),
      ),
  );

  return { short, extra };
};
