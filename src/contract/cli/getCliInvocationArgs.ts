import type { Command } from 'commander';
import { MalfunctionError } from 'helpful-errors';

import { getDecodedRoleDeltaToken } from '@src/domain.operations/roles/deltas/getDecodedRoleDeltaToken';

/**
 * .what = the argv the root program parsed, as the human typed it
 * .why = a wrapped refusal echoes its invocation (`rule.require.refusals-carry-context`), and the
 *        root program is the one owner of the parsed argv — in the cli and under test alike
 *
 * .note = the root reads its argv at parse, before any action runs, so a call from inside an
 *         action sees the full invocation
 * .note = `invoke` encodes each `-role` token with a sentinel so commander keeps it; the echo
 *         decodes it back, so a human reads the `-role` they typed
 */
export const getCliInvocationArgs = (input: { command: Command }): string[] => {
  // walk up to the root program, which holds the parsed argv
  const root = getRootCommand({ command: input.command });

  // commander records the argv as `rawArgs` at parse, but leaves it out of its typings
  if (!hasRawArgs(root))
    throw new MalfunctionError('commander root holds no rawArgs', {
      hint: 'a commander upgrade may have renamed the field; read its parse() source',
    });
  return root.rawArgs.map((token) => getDecodedRoleDeltaToken({ token }));
};

/**
 * .what = the root program of a commander command tree
 * .why = a subcommand holds no argv of its own; only the root records it at parse
 */
const getRootCommand = (input: { command: Command }): Command =>
  input.command.parent
    ? getRootCommand({ command: input.command.parent })
    : input.command;

/**
 * .what = whether a command carries the untyped `rawArgs` commander sets at parse
 * .why = narrows the field into the type with no cast
 */
const hasRawArgs = (
  command: Command,
): command is Command & { rawArgs: string[] } =>
  'rawArgs' in command &&
  Array.isArray(command.rawArgs) &&
  command.rawArgs.every((token: unknown) => typeof token === 'string');
