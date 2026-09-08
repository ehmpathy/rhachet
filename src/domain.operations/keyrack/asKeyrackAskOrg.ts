import type { PickOne } from 'type-fns';

import { isKeyrackSlugMachineWide } from './isKeyrackSlugMachineWide';
import { isKeyrackSlugRepoBound } from './isKeyrackSlugRepoBound';

/**
 * .what = the ONE canonical read of an ask's org — the only place any spelled form is decoded
 *
 * .what.contract = this cast decides ONE distinction exactly: is the ask machine-wide, or is it
 *                  not. a return of `'@all'` is contracted. a non-`@all` return names whichever
 *                  form stated the provenance, and is deliberately NOT a generalized
 *                  slug-outranks-flag read — see the last .note. read it for the distinction,
 *                  never as an authority on which real org an ask belongs to
 *
 * .why = an ask names its org two ways, and the two disagree in their no-org default:
 *        - the `--org` flag, whose cli default is `'@this'` (the `get` verb in invokeKeyrack.ts)
 *        - an `@all.`-prefixed slug in `for.keys`
 *        the sdk declares `org?: string` with NO default, so one logical ask arrives as
 *        `'@this'` from the cli and `undefined` from the sdk. one cast is what makes every
 *        verb serve `--org @all` identically BY CONSTRUCTION rather than by N careful edits
 *
 * .note = the union is STRICT in the DERIVED case — an ask whose org must be inferred from its
 *         keys alone. there, one `@all` key beside a repo key yields the repo org, never `@all`:
 *         any member that needs the manifest wins, so the load still runs. a per-key decision
 *         would move the repo members' provenance check from the upfront ORG_MISMATCH guard to
 *         a downstream name-collision assert, which is a weaker guarantee
 * ⚠️ .note = an explicit `--org @all` does NOT outrank that strictness. the flag speaks only for
 *         a key that states no org of its own — a BARE key name. a key that NAMES a real org
 *         carries an ORG_MISMATCH guard keyed on the SLUG's org (asKeyrackKeySlug.ts), which
 *         never consults `--org`, so to read the flag as machine-wide would skip the load and
 *         retire that guard. the flag cannot waive a check it is not an input to
 * .note = the repo selector (`for.repo`) is ALWAYS manifest-bound, checked before the keys.
 *         getAllKeyrackGrantsByRepo throws on a null manifest, so a `true` here would emit
 *         'no keyrack.yml found in repo' inside a repo that has one
 * .note = the slug-outranks-flag precedence below is applied for the `@all` segment ONLY, and
 *         that narrowness is deliberate. `{ keys: ['ehmpathy.prep.FOO'], org: '@this' }` returns
 *         `'@this'`, not `'ehmpathy'` — the flag wins where the slug is self-describing. to
 *         generalize the precedence would change no observable behavior, because every non-`@all`
 *         answer collapses to the same `false` at the one consumer, and both spellings are
 *         manifest-bound (the vision's e3). so it would add a code path with no reader
 *         (rule.prefer.wet-over-dry) while it widened a contract this cast does not owe.
 *         asKeyrackKeySlug.ts remains the authority on which real org a slug names
 */
export const asKeyrackAskOrg = (input: {
  /**
   * .what = the ask's selector — the keys it names, or the repo sweep it is
   * .why = REQUIRED-nullable rather than optional, per `rule.forbid.undefined-inputs`. an
   *        omitted selector is invisible at compile time, and this cast's whole job is to
   *        decide whether a load site was told enough to skip the manifest — the exact class
   *        of defect this operation exists to close (ehmpathy/rhachet#467). a new load site
   *        that forgets to thread the ask must fail to compile, never silently read `null`
   */
  for: PickOne<{ keys: string[]; repo: true }> | null;

  /**
   * .what = the provenance the caller named, if any
   * .why = REQUIRED-nullable for the same reason as `for`. the two cli/sdk spellings of "no
   *        org" ('@this' and undefined) already disagree upstream, so this input admits the
   *        one honest absence — null — and confines `undefined` to the published boundary
   *        that documents its own exception (genContextKeyrackGrantGet.ts)
   */
  org: string | null;
}): string | null => {
  // a repo sweep is repo-scoped BY DEFINITION, and this check is UNCONDITIONAL — it precedes
  // even an explicit --org. the repo selector's members are derived from the manifest itself,
  // so `--for repo --org @all` is not a machine-wide ask; it is a repo sweep with a
  // contradictory flag. to honor the flag here would make getAllKeyrackGrantsByRepo emit
  // 'no keyrack.yml found in repo' inside a repo that HAS one
  if (input.for?.repo) return null;

  // a full `@all` slug is SELF-DESCRIBING, so its own org segment outranks the --org flag. this is
  // not a courtesy — it mirrors what the read already does: asKeyrackKeySlug.ts decodes a full
  // slug from `parsed.org` alone and never consults --org, exempts `@all` from the ORG_MISMATCH
  // guard, and returns the slug verbatim. so for a full `@all`
  // slug the manifest contributes no part of the answer, and to skip its load can lose no check
  //
  // .note = this ordering is also what makes the cli's `'@this'` default — the one the `get` verb
  //         declares on `--org` in invokeKeyrack.ts — harmless BY CONSTRUCTION. that default is
  //         indistinguishable from a human who typed
  //         `--org @this`, so a `--key @all.camp.FOO` with no flag would otherwise read as
  //         repo-scoped and load the very manifest it never consults — the reported defect,
  //         merely relocated. the fix is this precedence, never a test for `!== '@this'`:
  //         negating the sigil would read the sdk's `undefined` as machine-wide and disable
  //         the ORG_MISMATCH guard wholesale (the overstatement hazard)
  const keys = input.for?.keys;
  const isEveryKeyMachineWide =
    !!keys?.length &&
    keys.every((key) => isKeyrackSlugMachineWide({ slug: key }));
  if (isEveryKeyMachineWide) return '@all';

  // ⚠️ THE STRICT UNION. a key that NAMES a real org binds the whole ask to a manifest, and no
  // --org flag can waive that — the ORG_MISMATCH guard is keyed on the SLUG's org, never on the
  // flag (asKeyrackKeySlug.ts), so a flag read as machine-wide here would skip the load and
  // retire a check it is not an input to. any member that needs the manifest wins
  const isAnyKeyRepoBound =
    !!keys?.length && keys.some((key) => isKeyrackSlugRepoBound({ slug: key }));
  if (isAnyKeyRepoBound) return input.org === '@all' ? null : input.org;

  // otherwise an explicit --org speaks: it is the caller's direct statement of provenance,
  // and for a BARE key it is the only statement there is
  if (input.org) return input.org;

  // an ask that names neither states no org, exactly as an absent --org does
  return null;
};
