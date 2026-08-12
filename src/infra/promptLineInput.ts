import { createInterface } from 'node:readline';

/**
 * .what = prompts user for single line of visible input
 * .why = enables simple line-by-line prompts (e.g., choice selection)
 *
 * .note = differs from promptVisibleInput — this reads one line, not all stdin
 * .note = differs from promptHiddenInput — this shows what user types
 *
 * ⚠️ .why raw mode on a tty = a terminal echoes typed characters ITSELF, by the driver,
 *         so that echo is a write node never performs and a stdout interceptor never sees.
 *         `withStdoutPrefix` tracks the cursor from what node writes, so a driver-side
 *         echo desyncs it: the real cursor sits on a fresh line while the interceptor
 *         still holds that it is mid-line, and the next `\n` renders a stray blank. raw
 *         mode silences the driver's echo and we write each character ourselves, so
 *         EVERY byte travels one path and the cursor model cannot drift. this mirrors
 *         promptHiddenInput, which writes its own `*` for the same reason.
 */
export const promptLineInput = async (input: {
  prompt: string;
}): Promise<string> => {
  // tty mode: echo each character ourselves, so every byte passes through stdout.write
  if (process.stdin.isTTY) {
    process.stdout.write(input.prompt);

    return new Promise((accept) => {
      let buffer = '';

      // enable raw mode for char-by-char input; this also silences the driver's echo
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
            accept(buffer.trim());
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
              // erase last char: move back, space, move back
              process.stdout.write('\b \b');
            }
            continue;
          }

          // printable character — echo it, since raw mode silenced the driver's echo
          if (code >= 32) {
            buffer += char;
            process.stdout.write(char);
          }
        }
      };

      process.stdin.on('data', onData);
    });
  }

  // non-tty mode: readline reads one line
  // .note = no terminal driver means no driver-side echo, so no cursor desync is possible
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
