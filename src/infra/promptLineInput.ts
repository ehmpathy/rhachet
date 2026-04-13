import { createInterface } from 'node:readline';

/**
 * .what = prompts user for single line of visible input
 * .why = enables simple line-by-line prompts (e.g., choice selection)
 *
 * .note = differs from promptVisibleInput — this reads one line, not all stdin
 * .note = differs from promptHiddenInput — this shows what user types
 */
export const promptLineInput = async (input: {
  prompt: string;
}): Promise<string> => {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  return new Promise((accept) => {
    process.stdout.write(input.prompt);

    rl.once('line', (answer) => {
      rl.close();
      accept(answer.trim());
    });
  });
};
