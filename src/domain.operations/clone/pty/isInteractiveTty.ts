/**
 * .what = is the given output stream an interactive terminal?
 * .why =
 *   - the managed-pty socket only makes sense for an INTERACTIVE enroll: a human
 *     at a real terminal whose stream we mirror. a headless `-p` one-shot (stdout
 *     piped to a file or another process) has no human to mirror and no live
 *     session to dispatch into, so it takes the plain-spawn fallback instead
 *   - this names the `interactive` half of `isCloneSocketEligible`, so the gate
 *     reads as narrative rather than an inline `process.stdout.isTTY` check
 *
 * .note = the stream is injected (prod passes `process.stdout`), so a test asserts
 *   both branches with a plain fake, never the real process
 */
export const isInteractiveTty = (input: {
  stdout: { isTTY?: boolean };
}): boolean => input.stdout.isTTY === true;
