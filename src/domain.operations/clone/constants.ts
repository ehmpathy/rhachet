/**
 * .what = the on-disk schema version of a clone's identity.json record
 * .why = a versioned record lets getCloneIdentity read an older shape (upgrade
 *   on read) and fail loud on a newer-unknown one, so a clone dir written by a
 *   future rhachet is never silently mis-read
 */
export const CLONE_IDENTITY_SCHEMA_VERSION = 1;

/**
 * .what = the tolerance (ms) on the transcript spawn-window predicate
 * .why = a brain writes its transcript file a moment AFTER we record the clone's
 *   spawnedAt, so a transcript of THIS spawn has mtime >= spawnedAt. a small
 *   negative tolerance absorbs clock + fs-granularity skew (a hair of clock
 *   drift) so a just-created transcript is never mis-judged as "before this
 *   spawn". kept SMALL (2s) so it never reaches back to a PRIOR session's
 *   transcript — the ambiguous-refuse guard handles any genuine 2+ overlap
 */
export const CLONE_SPAWN_WINDOW_TOLERANCE_MS = 2_000;

/**
 * .what = how long `say` waits for its dispatched message to appear in the brain's
 *   transcript — the proof the message left the input buffer and was submitted
 * .why = the brain writes the user turn to its transcript ON submit (before the
 *   assistant reply), so this only bounds the brief lag between the pty submit and
 *   the on-disk write, NOT the slow reply. generous enough (15s) to absorb a busy
 *   brain's write lag + a cold history re-link, short enough to fail loud fast when a
 *   submit genuinely did not land (the dogfood defect this verify exists to catch)
 */
export const CLONE_SUBMIT_VERIFY_TIMEOUT_MS = 15_000;
