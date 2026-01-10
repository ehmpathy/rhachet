import { shimConsoleLog } from './shimConsoleLog';

/**
 * .what = wrapper that applies emoji space shim for duration of logic execution
 * .why = abstracts shim lifecycle; guarantees restore via finally block
 */
export const withEmojiSpaceShim = async <T>(input: {
  logic: () => Promise<T>;
}): Promise<T> => {
  // apply the shim before logic executes
  const shim = shimConsoleLog();

  try {
    // execute the wrapped logic
    return await input.logic();
  } finally {
    // restore original console.log (runs on normal exit, error exit, or signal)
    shim.restore();
  }
};
