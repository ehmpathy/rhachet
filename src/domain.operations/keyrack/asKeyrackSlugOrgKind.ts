import { asKeyrackSlugFullOrNull } from './asKeyrackSlugFullOrNull';

/**
 * .what = classify ONE key by the provenance its own text states
 * .why = `isKeyrackSlugMachineWide` and `isKeyrackSlugRepoBound` read the SAME string to answer
 *        two halves of one question, and they were built on two different parsers — a naive
 *        `split('.')[0]` and a validated full-slug decode. for a well-formed key they agree; for
 *        a malformed one they DISAGREE, and the disagreement is silent
 *
 * ⚠️ .why.one-parser = `@all.badenv.FOO` is the divergence, and it is a real hazard, not a
 *                    curiosity. the naive split reads `@all` and calls it machine-wide; the
 *                    validated decode rejects the env and calls it a bare key name. read as
 *                    machine-wide, the manifest load is SKIPPED, and the read then reports
 *                    "add keyrack.yml to repo" from inside a repo that has one — an
 *                    OVERSTATEMENT, whose cost is a wrong answer rather than a wasted load
 * .note = one parser, three kinds, mutually exclusive and exhaustive by construction — so the
 *         two predicates below can no longer answer differently for the same string
 */
export const asKeyrackSlugOrgKind = (input: {
  slug: string;
}): 'machine-wide' | 'repo-bound' | 'bare' => {
  const parsed = asKeyrackSlugFullOrNull({ key: input.slug });

  // ⚠️ .why = a key that is not a FULL slug names no org at all, however many dots it carries.
  //         `my.api.KEY` and `@all.badenv.FOO` are both bare key names — the env segment is what
  //         separates a slug from a dotted name, and neither has a valid one. a bare key DEFERS
  //         to `--org`, which is what lets `get --org @all --key GITHUB_TOKEN` skip the manifest
  if (!parsed) return 'bare';

  // the machine-wide sigil is exempt from the ORG_MISMATCH guard (asKeyrackKeySlug.ts),
  // so no manifest contributes to its answer
  if (parsed.org === '@all') return 'machine-wide';

  // every other org — a real one, or `@this` — is checked against the manifest's own org, and
  // that check needs the manifest
  return 'repo-bound';
};
