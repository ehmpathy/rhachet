import { asKeyrackSlugOrgKind } from './asKeyrackSlugOrgKind';

/**
 * .what = does this ONE key NAME a real org, and so bind itself to a repo manifest?
 * .why = a full slug that names a real org (`ehmpathy.prep.FOO`) or `@this` carries an
 *        ORG_MISMATCH guard: `asKeyrackKeySlug` compares its org segment against the manifest's
 *        and throws when they differ. that guard needs a manifest, so an ask that holds such a
 *        key is manifest-bound NO MATTER what `--org` says
 *
 * ⚠️ .why.strict = this is what makes the union STRICT. without it, an explicit `--org @all`
 *                beside a real-org slug would skip the load and retire that slug's ORG_MISMATCH
 *                check — the overstatement hazard, whose cost is a silently wrong answer rather
 *                than a wasted load (1.vision e1/e3)
 *
 * .note = a BARE key name (`MY_KEY`) is NOT repo-bound by itself. it names no org, so it DEFERS
 *         to `--org` — which is exactly what lets `get --org @all --key GITHUB_TOKEN` skip the
 *         manifest, the wish's primary use case (u1)
 * .note = `@all.camp.FOO` is NOT repo-bound — `asKeyrackKeySlug` exempts the `@all` sigil from
 *         the ORG_MISMATCH guard, so no manifest contributes to its answer
 * .note = built on `asKeyrackSlugOrgKind` rather than its own parser, so it cannot disagree with
 *         `isKeyrackSlugMachineWide` about the same string
 */
export const isKeyrackSlugRepoBound = (input: { slug: string }): boolean =>
  asKeyrackSlugOrgKind({ slug: input.slug }) === 'repo-bound';
