import type { Command } from 'commander';

/**
 * .what = declares the program-level (global) options shared across all commands
 * .why = keeps the global option declaration in ONE place so the argv
 *        preprocessor's `GLOBAL_VALUE_FLAGS` can be enforced against it by a
 *        companion test (`invoke.globalValueFlags.test.ts`) — the same guard
 *        pattern `ROLES_DELTA_COMMANDS` uses. a new global flag that carries a
 *        value, added here without a paired `GLOBAL_VALUE_FLAGS` entry, would let
 *        getCommandFromArgv misread the command past it, skip the sentinel
 *        encode, and reopen the `-role` delta regression — so the test fails loud
 */
export const defineGlobalOptions = ({
  program,
}: {
  program: Command;
}): void => {
  program.option(
    '-c, --config <path>',
    'where to find the rhachet.use.ts config',
  );
};
