import { ConstraintError } from 'helpful-errors';

import { asKeyrackOrgMismatchRefusal } from '@src/domain.operations/keyrack/asKeyrackOrgMismatchRefusal';
import { asKeyrackSlugFullOrNull } from '@src/domain.operations/keyrack/asKeyrackSlugFullOrNull';

/**
 * .what = reduce a mutation ask (`--key` plus its resolved org/env) to the `org.env.key` triple
 *         it writes under, and refuse a slug that contradicts the flags it came with
 * .why = a FULL slug NAMES its own org and env, so it must be reduced to its bare key name before
 *        a mutation verb composes `$org.$env.$key`. handed the slug whole, `set` composed
 *        `@all.camp.@all.camp.SLUG_KEY` — a key written under a name no read verb can name, and
 *        one its own `del` twin could not remove
 *
 * ⚠️ .why.one-home = `set` and `del` are the two mutation verbs over one rack, and each carried
 *        this same reduction plus these same two guards. spelled twice, they DRIFTED: `set`'s
 *        copy was written env-first while `del`'s guarded org-first, so a slug that conflicted on
 *        both axes drew a DIFFERENT refusal from each verb — one input, two answers, picked by
 *        which verb a human typed, with no error either way (`rule.forbid.surprises`, nielsen-4).
 *        that is the defect this operation exists to make unrepeatable: the order, the messages,
 *        and the metadata keys have ONE home, so the two verbs cannot answer one input two ways
 *
 * ⚠️ .why.order = the ORG guard runs FIRST, and the order is OBSERVABLE rather than incidental.
 *        a slug can conflict on both axes at once (`--key otherorg.prod.KEY --env test`), and
 *        only the guard that runs first is ever reported. a later edit must not reshuffle these
 *        two as cosmetic — `keyrack.org-mismatch.acceptance.test.ts` `[case3]` asks a
 *        doubly-conflicted slug of BOTH verbs and demands the org answer from each
 *
 * ⚠️ .why.one-parser = the "is this a full slug?" question is decided by `asKeyrackSlugFullOrNull`
 *        — the SAME decoder every read verb uses — never by a second check of its own. a
 *        hand-rolled equivalent (`isKeyrackSlugFormat` + `asKeyrackSlugParts`, say) can agree
 *        with the read path on every input today and still be a SECOND definition of one rule.
 *        two definitions that agree today are a divergence with a date on it, and it would be
 *        silent:
 *        a key the mutation verbs read as a slug and the read verbs read as a bare name is written
 *        under a name that cannot be read back. one decoder makes that disagreement unspellable
 *        rather than merely absent (the same repair as the `status`/`list` env axis)
 *
 * .note = a bare key name is returned UNTOUCHED, under the org and env the ask resolved to. that
 *         is the common path, and it must stay free of every guard below — a bare name makes no
 *         claim about its own org or env, so it can contradict neither
 */
export const asKeyrackAskSlugParts = (input: {
  /** .what = the key exactly as asked — either a bare name, or a full `org.env.key` slug */
  key: string;

  /** .what = the org the ask resolved to, before the slug was read */
  org: string;

  /** .what = the env the ask resolved to, before the slug was read */
  env: string;

  /**
   * .what = the env the human SPELLED, or null when they spelled none
   * .why = this is the ONE way the two callers differ: `del --env` is required, `set --env` is
   *        optional. as a branch that difference forced two copies of the whole block; as an
   *        INPUT it is one presence check, so the two verbs share every other line
   *        (`rule.forbid.undefined-inputs` — "the human spelled none" is a real answer, stated)
   */
  envAsked: string | null;
}): { key: string; env: string; org: string } => {
  // a bare key name claims no org and no env, so it defers to the ask and conflicts with neither
  const parts = asKeyrackSlugFullOrNull({ key: input.key });
  if (!parts) return { key: input.key, env: input.env, org: input.org };

  const envOfSlug = parts.env || input.env;

  // ⚠️ ORG FIRST — see `.why.order` above
  // .note = the guard skips when the ask resolved to `@all`, which is what keeps `--org @all` a
  //         deliberate override on a repo slug rather than a refusal
  if (input.org !== '@all' && parts.org !== input.org)
    throw asKeyrackOrgMismatchRefusal({
      givenBy: 'slug',
      orgRejected: parts.org,
      orgOfManifest: input.org,
      key: input.key,
    });

  if (
    input.envAsked &&
    input.envAsked !== 'all' &&
    envOfSlug !== input.envAsked
  )
    throw new ConstraintError(
      `--env ${input.envAsked} conflicts with env in slug ${input.key}`,
      {
        key: input.key, // `key`, not `slug` — see the note on the guard above
        envOfFlag: input.envAsked,
        envOfSlug,
        hint: `drop --env, or pass --env ${envOfSlug} to match the slug`,
      },
    );

  return { key: parts.keyName, env: envOfSlug, org: parts.org };
};
