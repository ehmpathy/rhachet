/**
 * .what = the text with exactly one final newline dropped, every other byte kept
 * .why = a piped value arrives with the newline its upstream `echo` or read added; the value
 *        itself is the bytes before it. one transformer, so every piped-secret reader stores
 *        the same bytes for the same pipe
 *
 * .note = one newline only: `'a\n\n'` → `'a\n'`. edge spaces and inner newlines are data
 */
export const asTextWithFinalNewlineDropped = (input: {
  text: string;
}): string =>
  input.text.endsWith('\n') ? input.text.slice(0, -1) : input.text;
