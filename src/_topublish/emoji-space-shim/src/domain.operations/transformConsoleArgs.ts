import type { TerminalChoice } from '../domain.objects/TerminalChoice';
import { transformMessageForTerminal } from './transformMessageForTerminal';

/**
 * .what = transform console.log arguments for emoji space adjustment
 * .why = handles mixed argument types (strings, objects, etc)
 */
export const transformConsoleArgs = (input: {
  args: unknown[];
  terminal: TerminalChoice;
}): unknown[] => {
  return input.args.map((arg) => {
    // only transform string arguments
    if (typeof arg === 'string') {
      return transformMessageForTerminal({
        message: arg,
        terminal: input.terminal,
      });
    }

    // pass through non-strings unchanged
    return arg;
  });
};
