/**
 * .what = the on-disk DIR-NAME token for an anonymous enrolled actor —
 *   `actor.via.hash=<hash>`
 * .why =
 *   - the `actor.via.hash=` prefix is the single fact that names the hash
 *     namespace enroll owns. it is composed by getActorOndiskDir for a full
 *     path, but several readers need the bare TOKEN (a symlink target, an
 *     ownership `.includes` check, a display line) — this transformer owns that
 *     token so all of them route through ONE format, never a hand-rebuilt literal
 *   - a future format change (e.g. the flagged genEnrollmentHash versioned-prefix
 *     migration) then touches this one owner, not a grep-hunt of raw template
 *     literals scattered across the clone + init call graph
 *
 * .note = pure — just the token, never a path join (the join is getActorOndiskDir's)
 */
export const asActorOndiskDirName = (input: { hash: string }): string =>
  `actor.via.hash=${input.hash}`;
