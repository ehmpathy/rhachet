/**
 * .what = global options that carry a separate value token, so the token that
 *         follows them is that value — not the subcommand name
 * .why = `rhx -c rhachet.use.ts enroll ...` puts the config path between the
 *        global flag and the command; the value must be skipped to find `enroll`
 *
 * .note = the joined form (`--config=path`) needs no entry — it is a single
 *   token that begins with `-`, so it is skipped as a flag on its own
 * .note = exported so `invoke.globalValueFlags.test.ts` can enforce it stays in
 *   sync with the program's real global options (defineGlobalOptions). an
 *   un-gated value flag would let getCommandFromArgv misread the command past it,
 *   skip the sentinel encode, and reopen the `-role` delta regression
 */
export const GLOBAL_VALUE_FLAGS = new Set(['-c', '--config']);

/**
 * .what = finds the subcommand name in a `from: 'user'` argv (first positional)
 * .why = the argv preprocessor must know which command it feeds, because `-r`
 *        means `--roles` on `enroll` but `--role` on `act`/`ask`/`run`; only a
 *        command-aware encode avoids corruption of the peer commands' flags
 *
 * .note = skips a lead global `-c/--config <path>` and its value token
 * .note = returns null when no positional command token is present
 * .note = pure transformer — folded immutably, no index mutation
 */
export const getCommandFromArgv = (input: {
  args: string[];
}): string | null => {
  // fold the argv; `skipNext` marks that the prior token was a value-bearer
  // global flag, so the current token is its value (not the command)
  return input.args.reduce<{ command: string | null; skipNext: boolean }>(
    (acc, token) => {
      // once the command is found, carry it through unchanged
      if (acc.command !== null) return acc;

      // the prior token was a global flag that wants a value — this is that value
      if (acc.skipNext) return { command: null, skipNext: false };

      // a value-bearer global flag → its next token is a value, not the command
      if (GLOBAL_VALUE_FLAGS.has(token))
        return { command: null, skipNext: true };

      // any other flag (e.g. `--config=path`, `-c`) is not the command
      if (token.startsWith('-')) return { command: null, skipNext: false };

      // first positional token is the subcommand
      return { command: token, skipNext: false };
    },
    { command: null, skipNext: false },
  ).command;
};
