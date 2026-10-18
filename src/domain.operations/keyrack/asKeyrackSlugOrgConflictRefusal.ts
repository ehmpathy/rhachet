import { ConstraintError } from 'helpful-errors';

/**
 * .what = the one refusal for a full slug whose org differs from the `--org` the human spelled
 * .why = with an org allowlist, a slug can name one member while `--org` names another, and
 *        both pass the allowlist check. the read verb (`get`) and the mutation verbs (`set`,
 *        `del`) each meet that ask; one render means the three verbs refuse it with one message
 *        and one metadata shape, never two answers to one input
 */
export const asKeyrackSlugOrgConflictRefusal = (input: {
  /** .what = the key exactly as asked, a full `org.env.key` slug */
  key: string;

  /** .what = the org the human spelled via `--org` */
  orgAsked: string;

  /** .what = the org the slug names */
  orgOfSlug: string;
}) =>
  new ConstraintError(
    `--org ${input.orgAsked} conflicts with org in slug ${input.key}`,
    {
      key: input.key,
      org: { given: input.orgAsked, ofSlug: input.orgOfSlug },
      hint: `drop --org, or pass --org ${input.orgOfSlug} to match the slug`,
    },
  );
