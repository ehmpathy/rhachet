import { isTraceLogWriteFault } from './isTraceLogWriteFault';
import { writeCloneTraceLine } from './writeCloneTraceLine';

/**
 * .what = a fault-trace sink that writes the durable per-day trace log ALONE — the log half of
 *   `getCloneTraceSink`'s tee, with no stderr copy
 * .why = `clone say`'s stderr is a machine channel (its `--output json` envelope, its verdict). a
 *   per-poll probe degrade is not a verdict, so it goes to the durable log an operator reads; a
 *   fault that persists reaches the caller as the verdict (`unreadable`, with its cause)
 *
 * 🟡 .note = a write fault on the log is the one line this sink writes to stderr
 *   (`rule.forbid.failhide`). its prefix, `clone trace could not reach its durable log: `, is
 *   pinned whole by its integration test, so a stderr parser can skip it
 * .note = only an fs write fault `isTraceLogWriteFault` allows is named and passed over.
 *   every other error — a code defect, an unknown fault — is thrown up loud
 */
export const getOneCloneTraceSinkToLog = (input: {
  repoPath: string;
}): ((line: string) => void) => {
  return (line: string): void => {
    try {
      writeCloneTraceLine({ repoPath: input.repoPath, at: new Date(), line });
    } catch (error) {
      if (!isTraceLogWriteFault({ error })) throw error;
      const reason =
        typeof error === 'object' && error !== null && 'message' in error
          ? String(error.message)
          : String(error);
      process.stderr.write(
        `clone trace could not reach its durable log: ${reason}\n`,
      );
    }
  };
};
