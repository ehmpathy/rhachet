import * as readline from 'node:readline';

/**
 * .what = prompts user for input with visible echo
 * .why = enables interactive input for non-secret values (e.g., uris, names)
 *
 * .note = differs from promptHiddenInput — this shows what user types
 * .note = non-TTY mode reads ALL stdin for multiline content support
 */
export const promptVisibleInput = async (input: {
  prompt: string;
}): Promise<string> => {
  // non-tty mode (e.g., piped input, pty-with-answers)
  // .note = still write prompt so pty-with-answers can detect it
  // .note = writes to stderr so it doesn't corrupt JSON output on stdout (unix convention)
  if (!process.stdin.isTTY) {
    process.stderr.write(input.prompt);
    // read ALL stdin content, not just first line (supports multiline json, etc)
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
