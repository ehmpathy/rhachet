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
    // read ALL stdin content, not just first line
    const chunks: string[] = [];
    process.stdin.setEncoding('utf8');
    for await (const chunk of process.stdin) {
      chunks.push(chunk as string);
    }
    // trim whitespace to match extant .trim() behavior
    return chunks.join('').trim();
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
