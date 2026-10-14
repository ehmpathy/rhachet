/**
 * .what = tell the human, once, that this process waits on a file a peer holds
 * .why = the wait may last up to two minutes. a second `rhx init` beside a first would otherwise
 *   sit silent that whole time, and a silent wait reads as a hang
 *
 * .note = stderr, like the `ℹ` notices enroll already prints there, so stdout stays whole for
 *   any caller that parses it
 */
export const emitRepoMutexWaitNotice = (input: { path: string }): void => {
  process.stderr.write(
    `ℹ another rhx process holds ${input.path}; this one will wait for it\n`,
  );
};
