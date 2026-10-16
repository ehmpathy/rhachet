import { ConstraintError } from 'helpful-errors';

/**
 * .what = the sigils an org: member may never be
 * .why = `@all` names no org, and `@this` names the list itself; either as a member would
 *        let one manifest line waive the org boundary for every ask
 */
const ORG_SIGILS = ['@all', '@this'];

/**
 * .what = casts the raw `org:` value of a keyrack manifest into its allowlist
 * .why = a scalar is a one-member list, so one shape serves every guard; a malformed list
 *        is refused here, at parse, before any vault, daemon, or prompt is touched
 *
 * .note = order is kept as written — position 0 is the default org
 */
export const asKeyrackManifestOrgs = (input: {
  org: unknown;
  path: string;
}): string[] => {
  // a scalar `@all` is the grove scope — the whole manifest declares keys of no org, and
  // every ask already reaches `@all`. it is a scope, never a member, so a list may not hold it
  if (input.org === '@all') return ['@all'];

  // a scalar is a one-member allowlist
  const members = Array.isArray(input.org) ? input.org : [input.org];

  // refuse an empty list — @this would name no org
  if (members.length === 0)
    throw new ConstraintError('keyrack manifest org: lists no org', {
      path: input.path,
      hint: `name at least one org in ${input.path}, e.g. org: ahbode`,
    });

  // refuse each malformed member, in the order written; the text guard narrows each member
  return members.map((member, index): string => {
    if (typeof member !== 'string' || member.trim() === '')
      throw new ConstraintError(
        `keyrack manifest org: member ${index} is not an org name`,
        {
          path: input.path,
          member,
          hint: `each org: member must be a plain org name, e.g. org: [ahbode, bhanya]`,
        },
      );
    if (ORG_SIGILS.includes(member))
      throw new ConstraintError(
        `'${member}' cannot be an org: member — it names no org`,
        {
          path: input.path,
          member,
          hint: `remove '${member}' from org: in ${input.path}; to reach a key that belongs to no org, pass --org @all at ask time`,
        },
      );
    if (members.indexOf(member) !== index)
      throw new ConstraintError(`org '${member}' is listed more than once`, {
        path: input.path,
        member,
        hint: `remove the repeat of '${member}' from org: in ${input.path}`,
      });
    return member;
  });
};
