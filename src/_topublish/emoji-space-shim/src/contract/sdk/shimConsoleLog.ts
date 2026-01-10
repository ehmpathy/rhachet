import type { TerminalChoice } from '../../domain.objects/TerminalChoice';
import { detectTerminalChoice } from '../../domain.operations/detectTerminalChoice';
import { transformConsoleArgs } from '../../domain.operations/transformConsoleArgs';

/**
 * .what = apply the console.log shim for emoji space adjustment
 * .why = enables automatic emoji space fix across different terminals
 */
export const shimConsoleLog = (input?: {
  terminal?: TerminalChoice;
}): { restore: () => void } => {
  // detect or use provided terminal
  const terminal = input?.terminal ?? detectTerminalChoice();

  // store original console.log
  const originalLog = console.log;

  // replace console.log with transform wrapper
  console.log = (...args: unknown[]) => {
    const transformed = transformConsoleArgs({ args, terminal });
    originalLog.apply(console, transformed);
  };

  // return restore function
  return {
    restore: () => {
      console.log = originalLog;
    },
  };
};
