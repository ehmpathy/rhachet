/**
 * .what = the on-disk DIR-NAME token for one clone under its actor —
 *   `serial=<serial>`
 * .why =
 *   - the `serial=` prefix is the single fact that names a clone dir. it is
 *     composed by getCloneDir for a full path, but several readers need the bare
 *     TOKEN (a `.slugs/` symlink target, a slug-ownership `.includes` check) —
 *     this transformer owns that token so all of them route through ONE format,
 *     never a hand-rebuilt literal
 *   - pairs with asActorOndiskDirName so the on-disk dir-name convention is a
 *     single-owned fact across the whole clone call graph
 *
 * .note = pure — just the token, never a path join (the join is getCloneDir's)
 */
export const asCloneDirName = (input: { serial: string }): string =>
  `serial=${input.serial}`;
