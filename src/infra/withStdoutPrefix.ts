// regex to match ANSI escape sequences (ESC [ ... letter)
// biome-ignore lint/suspicious/noControlCharactersInRegex: intentional — ANSI escape sequences require the ESC control character
const ANSI_ESCAPE_REGEX = /^\x1b\[[0-9;]*[A-Za-z]/;

/**
 * .what = module-level current output prefix
 * .why = enables vault adapters with readline prompts to incorporate the prefix
 *
 * .note = readline tracks prompt length internally for cursor position
 * .note = if we prefix stdout but readline doesn't know, cursor gets confused
 * .note = vault adapters call getStdoutPrefix() and prepend to their readline prompts
 * .note = module-level state instead of env var for cleaner isolation
 */
let currentStdoutPrefix = '';

/**
 * .what = get the current stdout prefix
 * .why = enables readline-based prompts to prepend the prefix
 */
export const getStdoutPrefix = (): string => currentStdoutPrefix;

/**
 * .what = wraps async fn with stdout prefix for tree-format output
 * .why = enables nested CLI output to appear indented within treebucket structure
 *
 * .note = intercepts process.stdout.write and prefixes each line
 * .note = handles carriage returns and ANSI escape sequences for interactive prompts
 * .note = restores original stdout.write after fn completes
 * .note = sets KEYRACK_STDOUT_PREFIX env var so readline-based prompts can use it
 */
export const withStdoutPrefix = async <T>(
  prefix: string,
  fn: () => Promise<T>,
): Promise<T> => {
  const originalWrite = process.stdout.write.bind(process.stdout);
  const previousPrefix = currentStdoutPrefix;

  // set module-level prefix so vault adapters can read it via getStdoutPrefix()
  currentStdoutPrefix = prefix;

  // track whether cursor is at start of a new line (prefix needed)
  let atLineStart = true;

  // track whether any content has been output yet (to skip blank lines at start)
  let hasContent = false;

  // intercept stdout.write
  process.stdout.write = ((
    chunk: string | Uint8Array,
    enc?: BufferEncoding | ((err?: Error | null) => void),
    callback?: (err?: Error | null) => void,
  ): boolean => {
    // handle string chunks
    const str =
      typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString();

    // process character by character to handle \r, \n, and ANSI sequences
    let output = '';
    let i = 0;
    while (i < str.length) {
      // check for ANSI escape sequence
      const rest = str.slice(i);
      const ansiMatch = rest.match(ANSI_ESCAPE_REGEX);
      if (ansiMatch) {
        // pass through ANSI sequences unchanged
        output += ansiMatch[0];
        i += ansiMatch[0].length;
        continue;
      }

      const char = str[i]!;

      if (char === '\r') {
        // carriage return: cursor moves to start of current line
        // output prefix BEFORE \r so readline overwrites preserve outer prefix
        if (atLineStart) {
          output += prefix;
        }
        output += char;
        atLineStart = true;
        i++;
      } else if (char === '\n') {
        // newline: skip blank lines at start (caller provides whitespace)
        if (!hasContent) {
          i++;
          continue;
        }
        // move to new line, next content needs prefix
        output += char;
        atLineStart = true;
        i++;
      } else {
        // regular character: add prefix if at line start
        if (atLineStart) {
          output += prefix;
          atLineStart = false;
        }
        hasContent = true;
        output += char;
        i++;
      }
    }

    // write prefixed output
    if (typeof enc === 'function') {
      return originalWrite(output, enc);
    } else if (callback) {
      return originalWrite(output, enc, callback);
    } else if (enc) {
      return originalWrite(output, enc);
    }
    return originalWrite(output);
  }) as typeof process.stdout.write;

  try {
    return await fn();
  } finally {
    // ensure we end on a newline if mid-line
    if (!atLineStart) {
      originalWrite('\n');
    }
    // restore original stdout.write
    process.stdout.write = originalWrite;
    // restore previous prefix
    currentStdoutPrefix = previousPrefix;
  }
};
