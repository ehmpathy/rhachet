import { MalfunctionError } from 'helpful-errors';

/**
 * .what = a clone probe whose reply did not arrive within its window — the socket accepted the
 *   connect, then said naught before the bound
 * .why =
 *   - on a loaded box the cause is the clone's auth gate: it writes no frame until its
 *     peer-cred `ss` scan settles, and that scan can outlast a probe's 1s–5s window
 *     (ehmpathy/rhachet#678). the feed may be live and healthy; only the answer was late
 *   - the say must tell this apart from a feed that is not live: a re-enroll cures no slow box,
 *     so the copy for the two must differ. this class lets the probe degrade name it
 *     (`probe-unanswered`) by `instanceof`, with no message match
 *   - it extends MalfunctionError to keep the leaf's owner, exit code, and the message a caller
 *     already reads (rule.forbid.helpful-error-parents — a reach down, never up)
 */
export class CloneProbeReplyTimeoutError extends MalfunctionError {}
