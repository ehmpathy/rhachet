/**
 * .what = the first line of an error's message
 * .why = a helpful error appends its metadata below the headline; one leaf holds one line, and
 *        the boot (`rhx roles boot`) prints the whole refusal
 *
 * .note = the headline keeps its `✋ ConstraintError: ` prefix: a glyph alone is ambiguous, and
 *   the class word tells the reader who must act (rule.require.qualified-error-headers)
 */
export const asErrorHeadline = (input: { error: Error }): string =>
  input.error.message.split('\n')[0] ?? '';
