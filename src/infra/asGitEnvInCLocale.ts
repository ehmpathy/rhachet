/**
 * .what = a process env with git's messages pinned to the C locale
 * .why = a caller that reads git's stderr (e.g. `not a git repository`) must read the same words
 *        under any `LANG`; `LC_ALL` outranks every other locale var, so it alone pins them
 */
export const asGitEnvInCLocale = (input: {
  env: NodeJS.ProcessEnv;
}): NodeJS.ProcessEnv => ({ ...input.env, LC_ALL: 'C' });
