import { getCommandFromArgv } from '@src/domain.operations/roles/deltas/getCommandFromArgv';

/**
 * .what = maps the actor form onto its spawn: `clone @<slug> …` is an alias of
 *         `clone make @<slug> …`, and `clone make @<slug> …` spawns via the enroll path
 * .why = `rhx clone make @<slug>` spawns a clone of a declared actor, and `rhx clone @<slug>`
 *        is its short alias. enroll owns the spawn beneath both, so the two land there.
 *        the other `clone` verbs (`say`, `get`, `list` …) and the `@:<clone>` sigil stay on `clone`
 *
 * .note = the command token is found the way the dispatcher finds it, so a lead global
 *         `-c <path>` never misreads as the command
 * .note = `clone make` with no actor address passes through to the `make` verb, which refuses it
 */
export const asArgvWithActorFormAlias = (input: {
  args: string[];
}): string[] => {
  // only the `clone` command is a candidate
  if (getCommandFromArgv({ args: input.args }) !== 'clone') return input.args;

  // locate the command token
  const commandIndex = input.args.findIndex(
    (token, index) =>
      token === 'clone' &&
      getCommandFromArgv({ args: input.args.slice(0, index + 1) }) === 'clone',
  );

  // the alias: `clone @<slug> …` → `clone make @<slug> …`
  const isActorAddress = (token: string | undefined): boolean =>
    !!token && token.startsWith('@') && !token.startsWith('@:');
  const argsMake = isActorAddress(input.args[commandIndex + 1])
    ? [
        ...input.args.slice(0, commandIndex + 1),
        'make',
        ...input.args.slice(commandIndex + 1),
      ]
    : input.args;

  // the spawn: `clone make @<slug> …` → `enroll @<slug> …`
  const isMakeOfActor =
    argsMake[commandIndex + 1] === 'make' &&
    isActorAddress(argsMake[commandIndex + 2]);
  if (!isMakeOfActor) return argsMake;
  return [
    ...argsMake.slice(0, commandIndex),
    'enroll',
    ...argsMake.slice(commandIndex + 2),
  ];
};
