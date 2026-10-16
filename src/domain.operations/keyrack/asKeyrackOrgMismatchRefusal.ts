import { ConstraintError } from 'helpful-errors';

/**
 * .what = the ONE refusal every org-mismatch site throws
 * .why = three sites reject the same condition — "the org you named is not on the org
 *        allowlist this repo's manifest declares" — and each had drifted to its own render:
 *        `"foo"` vs `'foo'`, "keyrack.yml" vs "manifest", a hint on one and not the others, and three metadata
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
 * .note = the org facts nest under ONE `org` node, so the tree renders them as a sub-branch:
 *         `org` → `given: whodis` + `avail: ehmpathy, ahbode`. the leaf names follow the repo's
 *         refusal convention (`term=given`): `given` names the org that was REJECTED, whether
 *         a slug segment or the `--org` flag carried it (the message already says which), and
 *         `avail` is the manifest's allowlist
 *
 * .note.hint = the members come first, so a typo meets its correct spell before the line that
 *         would widen the list; `@all` comes last and qualified, since a refile of an org-owned
 *         key under `@all` is a defect, and `@all` stays honest only for a key with no org
 * .note.hint.slug = a slug-given refusal omits the `@all` clause. its key names an org, and
 *         `--org @all` on a full slug reads that org's key in place, past the allowlist gate
 */
export const asKeyrackOrgMismatchRefusal = (input: {
  /** what named the rejected org — a slug's own segment, or the `--org` flag */
  givenBy: 'slug' | 'flag';
  orgRejected: string;
  /** the manifest's org allowlist, in declared order */
  orgsOfManifest: string[];
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
  const metadata: Record<string, string | Record<string, string>> = {
    code: 'ORG_MISMATCH',
    ...(input.key ? { key: input.key } : {}),
    org: {
      given: input.orgRejected,
      avail: input.orgsOfManifest.join(', '),
    },
    hint: [
      `use one of ${input.orgsOfManifest.map((org) => `'${org}'`).join(', ')}`,
      `or add '${input.orgRejected}' to org: in .agent/keyrack.yml`,
      ...(input.givenBy === 'flag'
        ? ['or, for a key that belongs to no org, use --org @all']
        : []),
    ].join('; '),
  };

  return new ConstraintError(
    `${input.givenBy === 'slug' ? 'slug org' : '--org'} '${
      input.orgRejected
    }' is not on this manifest's org allowlist`,
    metadata,
  );
};
