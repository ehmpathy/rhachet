/**
 * .what = cast an app slug into the registry commit message
 * .why = the `chore(keyrack-infra):` commit convention is domain knowledge; a named
 *        cast keeps a future format change a one-file edit
 */
export const asKeyrackInfraRegistryGithubAppCommitMessage = (input: {
  slug: string;
}): string => `chore(keyrack-infra): register github app ${input.slug}`;
