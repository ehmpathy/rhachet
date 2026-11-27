/**
 * .what = lines joined as text, each one ended by a newline
 * .why = a boot body is a list of lines; this names the join, so a body is built as intent
 *
 * .note = no lines is the empty string, so an absent block adds no bytes
 */
export const asTextOfLines = (input: { lines: string[] }): string =>
  input.lines.map((line) => `${line}\n`).join('');
