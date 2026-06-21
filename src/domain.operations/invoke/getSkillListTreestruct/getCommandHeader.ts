import { getHasGlobChars } from './getHasGlobChars';

/**
 * .what = formats the command header line for skill list output
 * .why = self-descriptive output shows exactly what command was run
 */
export const getCommandHeader = (input: { pattern: string | null }): string => {
  // no pattern = plain rhx list
  if (!input.pattern) {
    return '🪨 rhx list';
  }

  // glob pattern = show as-is
  if (getHasGlobChars({ pattern: input.pattern })) {
    return `🪨 rhx list '${input.pattern}'`;
  }

  // contains pattern = wrap in asterisks to show implicit behavior
  return `🪨 rhx list '*${input.pattern}*'`;
};
