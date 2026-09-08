import { asKeyrackSlugFullOrNull } from './asKeyrackSlugFullOrNull';

/**
 * .what = the slugs in a set that carry NO org and NO env — the rows no `--org`/`--env` filter
 *         can ever claim, because they name neither axis
 * .why = a filter narrows on a slug's segments, so a row that is not a full slug survives NO
 *        filter. that exclusion is CORRECT (a bare `MY_KEY` defers to `--org` rather than carries
 *        one), but silent: the row vanishes from a filtered `list`/`status` at exit 0, and a human
 *        reads "this key is not on my rack" when the truth is "this row cannot be filtered"
 *
 * ⚠️ .why.named-rather-than-fixed = the fix is NOT to keep the row under every filter — that
 *        would hand `MY_KEY` to an `--org otherorg` sweep and answer a provenance question with a
 *        key of unknown provenance. the fix is to NAME the drop, so the human learns their host
 *        manifest holds a row that no scope flag can address (`rule.forbid.failhide`: the drop
 *        stays, the silence goes)
 *
 * .note = a host manifest's `hosts` keys are hand-authored yaml, so this set is reachable in
 *         practice. a repo manifest's slugs are DERIVED from `manifest.org`
 *         (`getAllKeyrackSlugsForEnv`) and so are full by construction — this can only be
 *         non-empty for host-sourced rows
 */
export const getAllKeyrackSlugsWithNoScope = (input: {
  slugs: string[];
}): string[] =>
  input.slugs.filter((slug) => !asKeyrackSlugFullOrNull({ key: slug }));
