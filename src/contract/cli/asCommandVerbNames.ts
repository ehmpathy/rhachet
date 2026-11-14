import type { Command } from 'commander';

/**
 * .what = the verbs a command group registers, in registration order
 * .why = an unknown-verb refusal names the verbs that do exist; one transformer reads them
 */
export const asCommandVerbNames = (input: { command: Command }): string[] =>
  input.command.commands.map((one) => one.name());
