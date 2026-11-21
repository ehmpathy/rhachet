import { CLONE_SAY_DEBUG_DIR_REL } from './socket/getCloneSayDebugLogPath';

/**
 * .what = where a human finds the clone daemon's trace, as the words a hint prints
 * .why =
 *   - every hint that sends a reader to the daemon trace names the repo log AND its fallback, so a
 *     reader whose repo log was unwritable still finds the line. one owner keeps the copies alike
 *   - each placeholder is an angle-bracket token, never a `$name`: a human who pastes the path
 *     into a shell must see that a part is theirs to fill, not get it expanded to an empty string
 *
 * .note = `<repo>` anchors the log to the repo root, since a reader may run the failed `say` from
 *   any dir; the clone's repo is the one the enroll ran in
 * .note = the placeholders `<repo>`, `<yyyy-mm-dd>`, `<tmpdir>`, `<uid>` stand for the parts
 *   `getCloneTraceLogPath` and `CLONE_TRACE_FALLBACK_DIR` compute; the unit test fills them and
 *   asserts the result equals what those two produce, so the copy cannot drift from the paths
 */
export const asCloneDaemonTraceWhereHuman = (): string =>
  `\`<repo>/${CLONE_SAY_DEBUG_DIR_REL}/daemon.<yyyy-mm-dd>.log\`, or \`<tmpdir>/rhachet.uid=<uid>/clone-trace/\` if that log was unwritable`;
