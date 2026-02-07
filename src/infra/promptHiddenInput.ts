import * as readline from 'node:readline';

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
    // read from stdin as a line
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
        resolve(line);
      });
      // handle stdin close without input (e.g., CI environment)
      rl.once('close', () => {
        if (resolved) return;
        resolved = true;
        resolve('');
      });
    });
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
