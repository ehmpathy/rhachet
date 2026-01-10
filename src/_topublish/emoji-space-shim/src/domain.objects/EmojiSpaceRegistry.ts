import type { TerminalChoice } from './TerminalChoice';

/**
 * .what = dictionary of emoji space consumption per terminal
 * .why = terminals disagree on emoji width; this maps emoji → terminal → consumed spaces
 */
export const EMOJI_SPACE_REGISTRY: Record<
  string,
  Partial<Record<TerminalChoice, number>>
> = {
  // emojis that consume 1 extra space in vscode only
  '🦫': { vscode: 1, default: 0 },
  '🪨': { vscode: 1, default: 0 },

  // emojis that consume 1 extra space in both vscode and standard terminals
  '🌩️': { vscode: 1, default: 1 },
  '⛈️': { vscode: 1, default: 1 },
};
