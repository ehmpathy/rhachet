import { getCommandFromArgv } from './getCommandFromArgv';
import { isRolesFlag } from './isRolesFlag';

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
 * .what = the only commands whose `--roles` uses the +/-/bare delta grammar,
 *         mapped to the arity of their `--roles` option
 * .why = the sentinel encode must apply to THESE commands alone. `-r` is the
 *        `--roles` short alias on `enroll`, but the `--role` (single-value)
 *        short alias on `act`/`ask`/`run`. a command-blind encode would rewrite
 *        those commands' later short flags (e.g. `-s`) into null bytes and
 *        break them. a command gate keeps the fix from leakage sideways.
 *
 * .note = arity matters for where the `--roles` value run ends:
 *   - `variadic` (`--roles <roles...>` on init/upgrade) collects every value
 *     token until the next `--flag`, so the encode spans the whole run
 *   - `single` (`--roles <spec>` on enroll) takes exactly ONE value token, so
 *     the run closes after it — later dash tokens (e.g. a brain passthrough
 *     `-v`) are NOT roles and must pass through untouched, never encoded
 */
export const ROLES_DELTA_COMMANDS: Record<string, 'single' | 'variadic'> = {
  init: 'variadic',
  enroll: 'single',
  upgrade: 'variadic',
};

/**
 * .what = the commands that read a bare role delta OUTSIDE a `--roles` run
 * .why = `rhx enroll claude -driver` is an alias of `--roles -driver`
 *   (`inventory.of=requirements.case=4`). enroll reads those deltas off the raw argv, so
 *   commander only has to leave them alone — and it would not: `-r` is enroll's
 *   `--roles` short alias, so commander's combo-short branch reads `-reviewer` as
 *   `-r eviewer`. the encode hides such a token from that branch
 */
export const BARE_DELTA_COMMANDS = new Set(['enroll']);

/**
 * .what = a single-dash token shaped like a role delta — `-driver`, `-ehmpathy/driver`
 * .why = a brain's own short flags (`-c`, `-p`) are one letter, so they never match and
 *   reach commander as before
 */
const isBareRemoveShaped = (input: { token: string }): boolean =>
  /^-[a-z0-9.][a-z0-9._-]+(\/[a-z0-9._-]+)?$/i.test(input.token);

/**
 * .what = decides whether a token ends the `--roles` value list
 * .why = a long flag (e.g. --hooks) after --roles is the next option, not a role
 */
const isNextFlag = (input: { token: string }): boolean =>
  input.token.startsWith('--');

/**
 * .what = rewrites `-role` tokens after `--roles` so commander keeps them
 * .why = enables the wish's literal `rhx init --roles +architect -reviewer`
 *        despite commander's variadic drop of `-`-prefixed values
 *
 * .note = only tokens that follow `--roles` up to the next `--flag` are touched
 * .note = `+role`, bare `role`, and `repo/role` tokens pass through unchanged
 * .note = pure transformer — decode happens in the shared tokenizer getRoleDeltaTokens
 * .note = folded immutably: a reduce carries a `withinRoles` flag (marks whether the
 *   current token sits inside a `--roles` value run) so each `-role` value is
 *   rewritten without index mutation
 */
export const getPreprocessedRoleArgv = (input: {
  args: string[];
}): string[] => {
  // only the `--roles` delta-grammar commands need the sentinel encode; leave
  // every other command's argv intact so `-r` (=`--role` on act/ask/run) and
  // its later short flags (e.g. `-s`) are never rewritten to null bytes
  const command = getCommandFromArgv({ args: input.args });
  const arity = command === null ? undefined : ROLES_DELTA_COMMANDS[command];
  if (!arity) return input.args;

  // a variadic `--roles` run stays open across every value token until the next
  // `--flag`; a single-valued run holds exactly one value then closes, so later
  // dash tokens (brain passthrough flags) are left untouched
  const runStaysOpen = arity === 'variadic';

  // a command that reads bare deltas also encodes a delta-shaped token outside the run
  const encodesBare = command !== null && BARE_DELTA_COMMANDS.has(command);

  // fold the argv; the `withinRoles` flag marks whether the current token sits
  // inside a `--roles` value run; rewrite each `-role` remove sigil to sentinel
  return input.args.reduce<{ result: string[]; withinRoles: boolean }>(
    (acc, token) => {
      // a `--roles` flag (or its `-r` short alias) opens a value run
      if (isRolesFlag({ token }))
        return { result: [...acc.result, token], withinRoles: true };

      // any other long flag closes the value run
      if (isNextFlag({ token }))
        return { result: [...acc.result, token], withinRoles: false };

      // inside the run, a single-dash token is a remove sigil → encode past commander
      if (acc.withinRoles && token.startsWith('-'))
        return {
          result: [...acc.result, INCREMENTAL_REMOVE_SENTINEL + token.slice(1)],
          withinRoles: runStaysOpen,
        };

      // inside the run, a bare/`+role`/`repo/role` value token passes through;
      // for a single-valued run this consumed the one value, so close the run
      if (acc.withinRoles)
        return { result: [...acc.result, token], withinRoles: runStaysOpen };

      // outside any run, a bare remove delta encodes past commander's combo-short branch,
      //   for the commands that read bare deltas; the raw argv still carries the original
      if (encodesBare && isBareRemoveShaped({ token }))
        return {
          result: [...acc.result, INCREMENTAL_REMOVE_SENTINEL + token.slice(1)],
          withinRoles: false,
        };

      // outside any run, the token passes through untouched
      return { result: [...acc.result, token], withinRoles: false };
    },
    { result: [], withinRoles: false },
  ).result;
};
