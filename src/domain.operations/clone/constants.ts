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
 * .what = the poll-loop deadline for `getCloneSayObservation` — how long `say` polls the
 *   input triple before it hands back a residual verdict
 * .why = it bounds a poll that reads BOTH bases each cycle: the transcript (the `released`
 *   proof — the brain writes the user turn ON submit, before the assistant reply) and the
 *   rendered screen (the `enqueued` / `buffered` state), toward whichever target the caller
 *   named. so it is no longer only "how long we wait for the transcript" — it is the overall
 *   bound on the observe loop, after which a `buffered` / `absent` / `unreadable` residual is
 *   reported rather than an endless wait on a turn the message may sit behind. generous
 *   enough (15s) to absorb a busy brain's write lag + a cold history re-link, short enough to
 *   report fast when a submit genuinely did not land (the dogfood defect this verify catches)
 */
export const CLONE_SUBMIT_VERIFY_TIMEOUT_MS = 15_000;
