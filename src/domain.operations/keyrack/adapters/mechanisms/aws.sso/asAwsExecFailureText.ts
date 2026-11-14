/**
 * .what = the cli's own complaint from an exec failure: its stderr, else the error's message
 * .why = the exec error's message wraps stderr in `Command failed: exec aws …`; the human and
 *   the caller's classifier need only what the cli said
 */
export const asAwsExecFailureText = (input: { error: unknown }): string => {
  const stderr = (input.error as { stderr?: unknown })?.stderr;
  if (typeof stderr === 'string' && stderr.trim()) return stderr.trim();
  if (input.error instanceof Error) return input.error.message;
  return String(input.error);
};
