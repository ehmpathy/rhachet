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
 * .what = whether a `.gitignore` line re-includes an actor dir — a repo actor negation
 *         some release or some `ambient:` wrote
 */
const isActorDirNegation = (input: { line: string }): boolean =>
  /^!\.agent\/\.actors\/actor\.via\.[^/]+\/$/.test(input.line);
