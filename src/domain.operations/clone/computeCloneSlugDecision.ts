/**
 * .what = the on-disk state of a `.slugs/<slug>` claim, as the enroll sees it
 * .why = the slug index is global (unique across actors), so the decision below
 *   turns on WHOSE clone a claim points at and whether that clone still lives
 */
export type CloneSlugClaimState =
  | { kind: 'unclaimed' } // no `.slugs/<slug>` entry, OR one whose clone dir is gone
  | { kind: 'live'; sameActor: boolean } // claim → a live clone
  | { kind: 'dead'; sameActor: boolean }; // claim → a dead clone
// .note = a stale claim (a `.slugs/<slug>` link whose clone dir is gone) is NOT its
//   own kind: the sole producer (genClone) resolves it through getOneCloneByRef →
//   null → 'unclaimed', so it self-heals to bake-fresh via that branch. we do NOT
//   advertise a fourth kind no code path constructs (a type/reality drift that would
//   mislead a reader into routing a differentiated notice off a dead variant)

/**
 * .what = what to do on an `--as @:<slug>` enroll — the four outcomes
 * .why = one decision word per situation, so genClone reads as a narrative and
 *   the slug lifecycle has no hidden branches
 */
export type CloneSlugDecision = 'reuse' | 'rebind' | 'collision' | 'bake-fresh';

/**
 * .what = decide the slug outcome from the requested slug + the claim state
 * .why =
 *   - `--as @:<slug>` is idempotent-by-slug: a second enroll of a still-LIVE
 *     same-actor slug REUSES the live clone (a cron re-enroll does not pile up);
 *     a DEAD same-actor slug REBINDS the name to a fresh clone; a slug held by a
 *     DIFFERENT actor is a COLLISION (fail loud — the global index is unique)
 *   - an unnamed enroll (no slug) always BAKES a fresh clone; a stale claim
 *     (points at a clone dir that is gone) SELF-HEALS to bake-fresh, so a crash
 *     between the claim and the dir never wedges the slug forever
 *
 * .note = pure: the caller resolves the claim state (an fs read); this maps it
 *   to the one decision word
 */
export const computeCloneSlugDecision = (input: {
  requestedSlug: string | null;
  claim: CloneSlugClaimState | null;
}): CloneSlugDecision => {
  // an unnamed enroll always bakes a fresh, nameless clone
  if (input.requestedSlug === null) return 'bake-fresh';

  const claim = input.claim ?? { kind: 'unclaimed' as const };

  // no claim, or a stale one (its clone dir is gone, resolved to unclaimed upstream)
  // — claim it fresh
  if (claim.kind === 'unclaimed') return 'bake-fresh';

  // a slug held by a DIFFERENT actor is a hard collision (global unique index)
  if (!claim.sameActor) return 'collision';

  // same-actor: reuse the live clone, or rebind the name off the dead one
  return claim.kind === 'live' ? 'reuse' : 'rebind';
};
