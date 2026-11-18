import { writeCloneTraceLine } from './writeCloneTraceLine';

/**
 * .what = the CLIENT-side fault-trace sink — the process's own stderr, TEE'd to the durable
 *   per-day trace log on disk
 * .why =
 *   - the `clone say` / `clone get` client paths (`getCloneInputStateOrBlind`,
 *     `writeCloneSayDebugLog`) inject a fault seam so a clamp captures it without a spy; this is
 *     the one owner of that seam's default
 *   - the TEE keeps a durable copy of a client fault beside the daemon's own lines, so a reader
 *     of the trace log sees both halves of a failed dispatch
 *
 * 🔴 .note = NEVER the daemon's sink. an attended daemon runs in the process that mirrors the
 *   brain-cli into the human's pane, so its stderr IS that pane: a trace written there paints
 *   over the brain-cli's screen, where it can be misread and relayed to the clone as input. the
 *   daemon uses `getOneCloneTraceSinkForDaemon`, which writes the log alone
 * .note = the pane guard is the daemon's alone, and the client needs none: a clone that runs
 *   `clone say` / `clone get` does so as a brain-cli tool call, whose stderr the brain-cli
 *   captures into the tool result, never onto the pane tty; a human who runs it in a shell reads
 *   that stderr as the command's own answer
 * .note = stderr is written FIRST and unconditionally; the log copy is strictly additive
 * .note = the day is read PER LINE, never once here: a process may live past midnight
 * .note = the durable half's own fault is NAMED on stderr rather than swallowed. it is the one
 *   catch here, and it is not a failhide: the line itself already reached stderr above, so
 *   what is reported is the loss of the SECOND copy
 */
export const getCloneTraceSink = (): ((line: string) => void) => {
  const toStderr = process.stderr.write.bind(process.stderr);

  return (line: string): void => {
    toStderr(line);

    try {
      writeCloneTraceLine({
        repoPath: process.cwd(),
        at: new Date(),
        line,
      });
    } catch (error) {
      toStderr(
        `clone trace could not reach its durable log: ${
          error instanceof Error ? error.message : String(error)
        }\n`,
      );
    }
  };
};
