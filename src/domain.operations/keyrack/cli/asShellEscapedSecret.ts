// regex patterns for control character detection
// biome-ignore lint/suspicious/noControlCharactersInRegex: intentional control char detection
const CONTROL_CHAR_PATTERN = /[\n\r\t\x00-\x1f]/;
// biome-ignore lint/suspicious/noControlCharactersInRegex: intentional control char detection
const OTHER_CONTROL_CHARS = /[\x00-\x1f]/g;

/**
 * .what = transform secret value for safe shell eval
 * .why = prevents command injection in export statements
 */
export const asShellEscapedSecret = (input: { secret: string }): string => {
  const { secret } = input;

  // if secret contains control chars (newlines, tabs, etc), use $'...' ANSI-C syntax
  const hasControlChars = CONTROL_CHAR_PATTERN.test(secret);

  if (hasControlChars) {
    // ANSI-C syntax: $'...'
    // - backslash -> \\
    // - single quote -> \'
    // - newline -> \n (literal backslash-n in the string)
    // - tab -> \t
    // - other control chars -> \xHH
    const escaped = secret
      .replace(/\\/g, '\\\\') // backslash first
      .replace(/'/g, "\\'") // single quote
      .replace(/\n/g, '\\n') // newline
      .replace(/\r/g, '\\r') // carriage return
      .replace(/\t/g, '\\t') // tab
      .replace(OTHER_CONTROL_CHARS, (char) => {
        // other control chars as hex
        const hex = char.charCodeAt(0).toString(16).padStart(2, '0');
        return `\\x${hex}`;
      });
    return `$'${escaped}'`;
  }

  // plain single quotes: 'secret'
  // single quote in content: 'sec'\''ret' (end, escaped, start)
  // backslash in plain quotes: preserved as-is (no escape needed)
  const escaped = secret.replace(/'/g, "'\\''");
  return `'${escaped}'`;
};
