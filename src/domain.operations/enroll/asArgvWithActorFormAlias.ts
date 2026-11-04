import { getCommandFromArgv } from '@src/domain.operations/roles/deltas/getCommandFromArgv';

/**
 * .what = maps the actor form `clone @<slug> …` onto `enroll @<slug> …`; all other argv passes through
 * .why = `rhx clone @<slug>` spawns a clone of a declared actor, and enroll owns that spawn.
 *        the `clone` subcommands (`say`, `get`, `list` …) and the `@:<clone>` sigil stay on `clone`
 *
 * .note = the command token is found the way the dispatcher finds it, so a lead global
 *         `-c <path>` never misreads as the command
 */
export const asArgvWithActorFormAlias = (input: {
  args: string[];
}): string[] => {
  // only the `clone` command is a candidate
  if (getCommandFromArgv({ args: input.args }) !== 'clone') return input.args;

  // locate the command token, then the token that follows it
  const commandIndex = input.args.findIndex(
    (token, index) =>
      token === 'clone' &&
      getCommandFromArgv({ args: input.args.slice(0, index + 1) }) === 'clone',
  );
  const tokenNext = input.args[commandIndex + 1] ?? '';

  // an actor address (`@<slug>`, never the clone sigil `@:`) → the enroll command
  const isActorAddress =
    tokenNext.startsWith('@') && !tokenNext.startsWith('@:');
  if (!isActorAddress) return input.args;
  return input.args.map((token, index) =>
    index === commandIndex ? 'enroll' : token,
  );
};
