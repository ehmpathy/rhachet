/**
 * .what = the on-disk DIR-NAME token for an actor — `actor.via.<exid>`
 * .why =
 *   - the `actor.via.` prefix is the single fact that names where actors live. it is
 *     composed by getActorOndiskDir for a full path, but several readers need the bare
 *     TOKEN (a symlink target, an ownership `.includes` check, a display line) — this
 *     transformer owns that token so all of them route through ONE format, never a
 *     hand-rebuilt literal
 *   - the exid carries its own namespace (`repo=ambient`, `hash=<h>`), so one format
 *     serves every actor — the repo actor is just an actor
 *
 * .note = pure — just the token, never a path join (the join is getActorOndiskDir's)
 */
export const asActorOndiskDirName = (input: { exid: string }): string =>
  `actor.via.${input.exid}`;
