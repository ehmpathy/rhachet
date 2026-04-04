/**
 * .what = prompts user for input with hidden echo (for passwords)
 * .why = enables secure passphrase entry without exposure to shell history or process lists
 *
 * .note = uses raw mode to read character by character without echo
 * .note = handles backspace, enter, ctrl+c, ctrl+d
 */
export const promptHiddenInput = async (input: {
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
    const content = chunks.join('');
    // trim final newline if present (stdin often ends with \n)
    return content.endsWith('\n') ? content.slice(0, -1) : content;
  }

  return new Promise((resolve, reject) => {
    // write the prompt
    process.stdout.write(input.prompt);

    // set raw mode to capture each keypress
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    let password = '';

    const onData = (char: string): void => {
      switch (char) {
        // enter (line feed or carriage return)
        case '\n':
        case '\r':
          cleanup();
          process.stdout.write('\n');
          resolve(password);
          break;

        // ctrl+d (end of input)
        case '\u0004':
          cleanup();
          process.stdout.write('\n');
          resolve(password);
          break;

        // ctrl+c (interrupt)
        case '\u0003':
          cleanup();
          process.stdout.write('\n');
          reject(new Error('interrupted'));
          break;

        // backspace (delete last char)
        case '\u007F':
        case '\b':
          if (password.length > 0) {
            password = password.slice(0, -1);
          }
          break;

        // regular character
        default:
          password += char;
          break;
      }
    };

    const cleanup = (): void => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener('data', onData);
    };

    process.stdin.on('data', onData);
  });
};
