/**
 * .what = a `.gitignore` content with every actor-dir negation dropped, save the current one
 * .why = under a manifest the repo actor is the `ambient:` actor, so a former repo actor dir
 *        (`repo=ambient`, or a prior `ambient:` slug) must be ignored again, as the legacy
 *        `.default` dir is. one negation re-includes one dir; a stale one would commit a peer's
 *        brain dir
 */
export const asGitignoreWithoutFormerActorNegations = (input: {
  content: string;
  negation: string;
}): string =>
  input.content
    .split('\n')
    .filter((line) => line === input.negation || !isActorDirNegation({ line }))
    .join('\n');

/**
 * .what = whether a `.gitignore` line re-includes a dir that a repo actor could have held —
 *         a negation some release or some `ambient:` wrote
 *
 * .note = only the two repo actor identities match: `repo=<x>` and a plain `slug=<x>`. a hash
 *   actor (`hash=`) or a derived one (`slug=<x>._.delta=`) is never a repo actor, so a
 *   negation of one is a human's, and it is kept byte for byte
 */
const isActorDirNegation = (input: { line: string }): boolean =>
  /^!\.agent\/\.actors\/actor\.via\.(repo|slug)=[^/]+\/$/.test(input.line) &&
  !input.line.includes('._.delta=');
