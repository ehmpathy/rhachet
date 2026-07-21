/**
 * .what = sentinel that marks a `-role` remove token after argv preprocess
 * .why = commander's variadic `--roles <roles...>` halts collection at any
 *        token that begins with `-`, so a literal `-reviewer` would be dropped.
 *        we rewrite the lead `-` to this sentinel (a null byte — impossible
 *        in a shell arg) so commander keeps the token as a plain value; the CLI
 *        action decodes it back to `-` before classification.
 */
export const INCREMENTAL_REMOVE_SENTINEL = '\u0000';

/**
 * .what = decides whether a token ends the `--roles` value list
 * .why = a long flag (e.g. --hooks) after --roles is the next option, not a role
 */
const isNextFlag = (token: string): boolean => token.startsWith('--');

/**
 * .what = rewrites `-role` tokens after `--roles` so commander keeps them
 * .why = enables the wish's literal `rhx init --roles +architect -reviewer`
 *        despite commander's variadic drop of `-`-prefixed values
 *
 * .note = only tokens that follow `--roles` up to the next `--flag` are touched
 * .note = `+role`, bare `role`, and `repo/role` tokens pass through unchanged
 * .note = pure transformer — decode happens in the CLI action via getDecodedRoleToken
 * .note = folded immutably: a reduce carries a `withinRoles` flag (marks whether the
 *   current token sits inside a `--roles` value run) so each `-role` value is
 *   rewritten without index mutation
 */
export const getPreprocessedRoleArgv = (input: {
  args: string[];
}): string[] => {
  // fold the argv; the `withinRoles` flag marks whether the current token sits
  // inside a `--roles` value run; rewrite each `-role` remove sigil to sentinel
  return input.args.reduce<{ result: string[]; withinRoles: boolean }>(
    (acc, token) => {
      // a `--roles` flag opens a value run
      if (token === '--roles')
        return { result: [...acc.result, token], withinRoles: true };

      // any other long flag closes the value run
      if (isNextFlag(token))
        return { result: [...acc.result, token], withinRoles: false };

      // inside the run, a single-dash token is a remove sigil → encode past commander
      if (acc.withinRoles && token.startsWith('-'))
        return {
          result: [...acc.result, INCREMENTAL_REMOVE_SENTINEL + token.slice(1)],
          withinRoles: true,
        };

      // any other token passes through with the run state left as-is
      return { result: [...acc.result, token], withinRoles: acc.withinRoles };
    },
    { result: [], withinRoles: false },
  ).result;
};
