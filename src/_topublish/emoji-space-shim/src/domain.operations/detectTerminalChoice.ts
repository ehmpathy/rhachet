import type { TerminalChoice } from '../domain.objects/TerminalChoice';

/**
 * .what = detect the current terminal type from environment
 * .why = enables auto-detection for space adjustment rules
 */
export const detectTerminalChoice = (): TerminalChoice => {
  // check TERM_PROGRAM first (most specific)
  if (process.env.TERM_PROGRAM === 'vscode') return 'vscode';
  if (process.env.TERM_PROGRAM === 'gnome-terminal') return 'gnome';

  // check TERM for xterm variants
  if (process.env.TERM?.includes('xterm')) return 'xterm';

  // fallback to default
  return 'default';
};
