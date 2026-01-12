/**
 * .what = indents each line of a string with a prefix
 * .why = consistent format for multi-line log output
 */
export const indentLines = (input: {
  text: string;
  prefix: string;
}): string => {
  return input.text
    .split('\n')
    .map((line) => `${input.prefix}${line}`)
    .join('\n');
};
