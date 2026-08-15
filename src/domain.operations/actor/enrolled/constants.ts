/**
 * .what = the max byte length of ONE enrollment.jsonl line (incl. the newline)
 * .why =
 *   - enrollment.jsonl is append-only and MANY clones of one actor may append
 *     concurrently. a POSIX O_APPEND write of <= PIPE_BUF bytes is atomic, so
 *     no two concurrent appends interleave into a corrupt line — but ONLY if
 *     every line stays within that bound
 *   - PIPE_BUF is 4096 on linux (the smallest common value), so we cap a line
 *     at 4096 bytes and truncate the one unbounded field (the caller's reason)
 *     to keep the guarantee
 *
 * .note = the cap INCLUDES the final '\n' — the writer measures line + '\n'
 */
export const ENROLLMENT_LINE_MAX_BYTES = 4096;

/**
 * .what = the on-disk schema version stamped on each enrollment.jsonl line
 * .why = a reader keys its tolerant read on this — an older/absent version is
 *   upgraded-on-read, a newer-unknown version fails loud with an upgrade hint
 */
export const ENROLLMENT_LOG_SCHEMA_VERSION = 1;

/**
 * .what = the on-disk schema version of the actor.json identity manifest
 * .why = getAllActorsOndisk keys its tolerant read on this — a field addition
 *   bumps the version but does NOT read every extant actor as corrupt; a
 *   newer-unknown version fails loud with an upgrade hint
 */
export const ACTOR_MANIFEST_SCHEMA_VERSION = 1;
