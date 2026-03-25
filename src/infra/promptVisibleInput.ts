import * as readline from 'node:readline';

/**
 * .what = prompts user for input with visible echo
 * .why = enables interactive input for non-secret values (e.g., uris, names)
 *
 * .note = differs from promptHiddenInput — this shows what user types
 */
export const promptVisibleInput = async (input: {
  prompt: string;
}): Promise<string> => {
  // skip if stdin is not a tty (e.g., piped input)
  if (!process.stdin.isTTY) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    });
    return new Promise((resolve) => {
      let resolved = false;
      rl.once('line', (line) => {
        if (resolved) return;
        resolved = true;
        rl.close();
        resolve(line.trim());
      });
      // handle stdin close without input (e.g., CI environment)
      rl.once('close', () => {
        if (resolved) return;
        resolved = true;
        resolve('');
      });
    });
  }

  // interactive terminal
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(input.prompt, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
};
