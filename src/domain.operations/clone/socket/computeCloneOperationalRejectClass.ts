/**
 * .what = the closed set of operational reject reasons a clone dispatch can NACK with —
 *   the twin of `CloneWithheldReason`, but for a reject that is NOT a pre-check verdict
 * .why = `sayClone` must tell a caller-amendable reject (bad input the caller fixes) from a
 *   server-fault reject (a dead brain-cli, a pty fault, a full/stopped queue) so it throws
 *   the right class per `rule.require.exit-code-semantics` — a caller fault is a
 *   `ConstraintError` (exit 2), a server fault is a `MalfunctionError` (exit 1). a bare
 *   prose reason cannot be classified without a magic-string match across two files
 *   (`rule.forbid.magic-values`), so the reason rides the wire as one of these slugs
 *
 * .note = this module OWNS the reason vocabulary — the server (`genCloneSocketServer`) and
 *   the write queue (`genCloneWriteQueue`) both import it and emit these slugs; `sayClone`
 *   imports it to classify. no generic wire primitive imports from a `say`-decision module
 */
export type CloneOperationalRejectReason =
  // caller-amendable — the caller fixes the input and retries (exit 2, ConstraintError)
  | 'frame-cap-exceeded'
  | 'not-valid-json'
  | 'not-a-say'
  | 'disallowed-control'
  // server-fault — the clone/queue state is at fault (exit 1, MalfunctionError)
  | 'no-live-brain-cli'
  | 'pty-write-fault'
  | 'feed-faulted'
  | 'queue-full'
  | 'clone-stopped'
  | 'clone-drained'
  | 'auth-gate-timeout'
  | 'auth-denied'
  | 'server-fault';

/**
 * .what = the reasons a caller can fix in the request itself
 * .why = these are the ONLY reject reasons that warrant a caller-fault exit code (2). every
 *   other reason — a dead brain-cli, a pty fault, a full or drained queue — is a server
 *   state the caller cannot fix by a new message, so it defaults to a server fault
 */
const CLONE_CALLER_AMENDABLE_REJECT_REASONS: readonly CloneOperationalRejectReason[] =
  ['frame-cap-exceeded', 'not-valid-json', 'not-a-say', 'disallowed-control'];

/**
 * .what = human copy per reason — states what went wrong and the fix (rule.require.errors-name-the-fix)
 */
export const CLONE_OPERATIONAL_REJECT_COPY: Record<
  CloneOperationalRejectReason,
  string
> = {
  'frame-cap-exceeded':
    'the message exceeds the wire frame cap — send a shorter message',
  'not-valid-json': 'the dispatch request was not valid json',
  'not-a-say': 'the dispatch request was not a say { message }',
  'disallowed-control':
    'the message carries disallowed terminal control — send plain text',
  'no-live-brain-cli':
    'no live brain-cli is behind this socket — the clone has exited; re-enroll it',
  'pty-write-fault': 'the write to the clone pty faulted',
  'feed-faulted':
    'the clone screen feed faulted (its emulator threw), so the input read is in doubt — the say was withheld rather than pasted blind over the human; re-enroll the clone to rebuild the feed',
  'queue-full': 'the clone write queue is full — retry once the clone drains',
  'clone-stopped': 'the clone is stopped',
  'clone-drained':
    'the clone connection drained before the message was delivered',
  'auth-gate-timeout':
    'the clone could not confirm the caller is the same unix user within its bound (its `ss` peer-credential lookup did not settle) — the message was never written; retry, and if it recurs the host socket table is likely saturated (prune stale clones with `rhx clone prune`)',
  'auth-denied':
    'the caller is not the same unix user as the clone — a clone socket accepts only its own user; run the say as the user that enrolled the clone',
  // .why = the residual. the frame handler threw somewhere the closed set above does not name,
  //   so the reason is the CLASS rather than the cause — and the cause is on the clone's own
  //   trace log, which this copy names so the reader does not have to hunt for it. before this
  //   slug that throw ended the connection with no reply at all, and the caller read it as a
  //   30s wedge with `acksSeen: []` (measured 2026-09-19)
  'server-fault':
    'the clone faulted while it handled the message — the message may not have been written; retry, and read the clone daemon trace (`.agent/.cache/repo=$repo/skill=clone-say/daemon.$date.log`) for the line that names the throw',
};

/**
 * .what = narrow an arbitrary wire reason to a known operational reject reason
 */
export const isCloneOperationalRejectReason = (
  reason: string | null,
): reason is CloneOperationalRejectReason =>
  // OWN-property test, never `in`: `in` walks the prototype chain, so a wire reason of
  // `constructor` / `toString` / `hasOwnProperty` — which our own closed set never emits, but
  // a corrupt or brand-new peer could — would pass the guard and read the copy off an
  // inherited function. Object.keys returns only OWN enumerable keys, so a `.includes` over it
  // fails those inherited names, so an unknown reason reports a reach fault rather than a
  // garbled copy (matches isCloneWithheldReason's own-set `.includes` check)
  reason !== null &&
  Object.keys(CLONE_OPERATIONAL_REJECT_COPY).includes(reason);

/**
 * .what = classify a reject reason as caller-amendable (exit 2) or server-fault (exit 1)
 * .why = an UNKNOWN reason (a contract drift, a slug this client does not know) defaults to
 *   server-fault — a client that cannot classify the server's reason must not tell the caller
 *   "your input was bad"; the safe default is "the server is at fault", which fails loud
 */
export const computeCloneOperationalRejectClass = (input: {
  reason: string;
}): 'caller-amendable' | 'server-fault' =>
  (CLONE_CALLER_AMENDABLE_REJECT_REASONS as readonly string[]).includes(
    input.reason,
  )
    ? 'caller-amendable'
    : 'server-fault';
