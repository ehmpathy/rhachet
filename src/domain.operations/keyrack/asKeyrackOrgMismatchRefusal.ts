import { ConstraintError } from 'helpful-errors';

/**
 * .what = the ONE refusal every org-mismatch site throws
 * .why = three sites reject the same condition — "the org you named is not the org this repo's
 *        manifest declares" — and each had drifted to its own render: `"foo"` vs `'foo'`,
 *        "keyrack.yml" vs "manifest", a hint on one and not the others, and three metadata
 *        vocabularies. a human hit two of them in one session and read two different failures
 *        (`rule.forbid.snapshot-visual-blemishes`, `rule.require.ubiqlang`)
 *
 * ⚠️ .why.not-one-message = the SUBJECT genuinely differs and must survive. a slug carries its
 *        org in a segment the caller typed (`foreign-org.prep.KEY`); the `--org` flag carries it
 *        as a flag value. those are different inputs with different fixes, so one flat sentence
 *        for both would trade a cosmetic drift for an ambiguous label
 *        (`rule.forbid.ambiguous-labels`). what is shared — and what this transformer owns — is
 *        the FORMAT: quote style, the word for the manifest, the metadata convention, the hint
 *
 * .note = the metadata keys follow the repo's refusal convention (`term=given`): `*Given` names
 *         the input that was REJECTED, a bare `*Of*` names a FACT about the world. so a slug's
 *         org is `orgOfSlug` (a fact of the slug the caller typed) while a flag's org is
 *         `orgGiven` (the value rejected), and the manifest's own org is always `orgOfManifest`
 */
export const asKeyrackOrgMismatchRefusal = (input: {
  /** what named the rejected org — a slug's own segment, or the `--org` flag */
  givenBy: 'slug' | 'flag';
  orgRejected: string;
  orgOfManifest: string;
  /**
   * the key under ask, when the site knows it
   * ⚠️ named `key`, NOT `slug`. `getKeyrackBlockedReport` renders a `metadata.slug` leaf as
   *    `repo: …` — that name means a github repo slug to the infra errors it was written for,
   *    so a keyrack key slug under it renders as a flat lie
   */
  key: string | null;
}): ConstraintError => {
  // .why.typed = the metadata is widened to a plain string record rather than inferred. the
  //   two branches below yield different literal types, and a union of literals is not
  //   assignable to `ConstraintError`'s invariant metadata slot — so an inferred object
  //   typechecks at each call site and fails at this declaration
  const metadata: Record<string, string> = {
    code: 'ORG_MISMATCH',
    ...(input.key ? { key: input.key } : {}),
    ...(input.givenBy === 'slug'
      ? { orgOfSlug: input.orgRejected }
      : { orgGiven: input.orgRejected }),
    orgOfManifest: input.orgOfManifest,
    hint: `use an org under '${input.orgOfManifest}', or pass --org @all`,
  };

  return new ConstraintError(
    `${input.givenBy === 'slug' ? 'slug org' : '--org'} '${
      input.orgRejected
    }' does not match manifest org '${input.orgOfManifest}'`,
    metadata,
  );
};
