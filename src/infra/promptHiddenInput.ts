/**
 * .what = prompts user for input with hidden echo (for passwords)
 * .why = enables secure passphrase entry without exposure to shell history or process lists
 *
 * .note = TTY mode: shows ***** as user types (raw mode with asterisk echo)
 * .note = non-TTY mode: reads ALL stdin for multiline secrets (e.g., PEM files)
 */
export const promptHiddenInput = async (input: {
  prompt: string;
}): Promise<string> => {
  // TTY mode: asterisk masking
  if (process.stdin.isTTY) {
    process.stdout.write(input.prompt);

    return new Promise((resolve) => {
      let buffer = '';

      // enable raw mode for char-by-char input
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');

      const onData = (chunk: string): void => {
        // .note = in PTY mode with raw mode, multiple chars can arrive at once
        for (const char of chunk) {
          const code = char.charCodeAt(0);

          // Enter (CR or LF)
          if (code === 13 || code === 10) {
            process.stdin.setRawMode(false);
            process.stdin.pause();
            process.stdin.removeListener('data', onData);
            process.stdout.write('\n');
            resolve(buffer);
            return;
          }

          // Ctrl+C
          if (code === 3) {
            process.stdin.setRawMode(false);
            process.stdin.pause();
            process.stdin.removeListener('data', onData);
            process.stdout.write('\n');
            process.exit(130);
          }

          // Backspace (DEL or BS)
          if (code === 127 || code === 8) {
            if (buffer.length > 0) {
              buffer = buffer.slice(0, -1);
              // erase last asterisk: move back, space, move back
              process.stdout.write('\b \b');
            }
            continue;
          }

          // printable character
          if (code >= 32) {
            buffer += char;
            process.stdout.write('*');
          }
        }
      };

      process.stdin.on('data', onData);
    });
  }

  // non-TTY mode: read ALL stdin content for multiline secrets (e.g., PEM files)
  const chunks: string[] = [];
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) {
    chunks.push(chunk as string);
  }
  const content = chunks.join('');
  // trim final newline if present (stdin often ends with \n)
  return content.endsWith('\n') ? content.slice(0, -1) : content;
};
