/**
 * .what = the byte a clone's dispatch writes to the brain-cli pty to SUBMIT the
 *   typed message (the Enter key), after the message content is typed
 * .why =
 *   - `\r` (carriage return) is the Enter key a raw-mode tty delivers, so it submits
 *     the message the brain has in its input buffer
 *   - it is written SEPARATELY, a tick after the message content, so the submit lands
 *     in its own pty read AFTER the input reader has committed the typed message
 */
export const CLONE_SUBMIT = '\r';

/**
 * .what = the byte sequence a clone's dispatch writes to INSERT a newline with NO
 *   submit — the soft-newline (the "Shift/Option-Enter" a human presses to add a
 *   line inside one message), so a multi-line `say` reaches the brain as ONE turn
 * .why =
 *   - a raw `\n` (or `\r`) submits the message; a booted claude commits the buffer
 *     and sends at the first newline. so a multi-line message written verbatim would
 *     submit only its FIRST line and drop the rest
 *   - `\x1b\r` (ESC + CR = meta-return) is the sequence claude-code's input reader
 *     honors as "insert a newline, hold the submit" — the injectable twin of the
 *     Option/Shift-Enter keystroke. asCloneDispatchFrame maps each interior `\n` to
 *     this, so the whole block lands in the input box, then the separate CLONE_SUBMIT
 *     `\r` commits it as one turn
 *   - it is introduced at FRAME time, past isSafeCloneDispatchInput, so a caller can
 *     never inject a bare ESC themselves (the gate rejects that); only a plain `\n`
 *     in the caller's message is translated here, code-controlled
 */
export const CLONE_SOFT_NEWLINE = '\x1b\r';

/**
 * .what = the FLOOR of the pause between a clone's bulk content write and its submit
 *   `\r` — the minimum wait even for a short message
 * .why =
 *   - the server bulk-writes the whole message in ONE pty write (a booted claude accepts
 *     a bulk content write — proven real-haiku 2026-08-13, see
 *     lesson.clone-say-bulk-write-works), then submits with a `\r`. claude commits a
 *     paste asynchronously; if the `\r` rides in the SAME read as the content it submits
 *     an empty line, so the submit waits in a SEPARATE, later read
 *   - a short message commits well under 8ms, but the live probe showed a flat 8ms LOST
 *     a long paste — so the floor sits comfortably above 8ms to never race a real message
 */
export const CLONE_SUBMIT_DELAY_FLOOR_MS = 50;

/**
 * .what = the per-character growth of the submit delay — a larger paste takes longer for
 *   claude to commit before the `\r`
 * .why = the real-haiku probe (2026-08-13): 8ms LOST a 3728-char paste, 1000ms LANDED it.
 *   0.3ms/char = 1118ms at 3728 chars — inside the proven-safe band, near-instant for a
 *   short message. this replaces the retired char-at-a-time cadence: the CONTENT write is
 *   now instantaneous, only this ONE post-content pause scales with size
 */
export const CLONE_SUBMIT_DELAY_PER_CHAR_MS = 0.3;

/**
 * .what = the CAP on the submit delay, so an enormous message cannot wait unboundedly
 * .why = 0.3ms/char is proven to 3728 chars; the cap bounds the wait for a much larger
 *   message until that regime is probed (see lesson.clone-say-bulk-write-works caveats)
 */
export const CLONE_SUBMIT_DELAY_CAP_MS = 2_000;

/**
 * .what = the FLOOR of the in-flight ("wedged") timeout — the minimum window a
 *   dispatch waits for its `delivered` ack before it is called wedged
 * .why = a short prompt commits well under a second, but a generous fixed floor keeps
 *   a busy-but-healthy brain from a false wedged verdict; the length scale
 *   (computeCloneWedgedTimeout) only raises the window above this floor for a large send
 */
export const CLONE_WEDGED_TIMEOUT_FLOOR_MS = 30_000;

/**
 * .what = the SLACK added on top of a message's send budget when the send budget
 *   exceeds the wedged floor — headroom so the window always outlasts the true send
 * .why = the wedged window is derived from the SAME computeCloneSubmitDelay the server's
 *   write loop uses, plus this slack, so the window can never drift below the real send
 *   time — only a genuinely stalled clone (one that never acks) trips it
 */
export const CLONE_WEDGED_TIMEOUT_SLACK_MS = 10_000;

/**
 * .what = the max bytes one wire frame (a newline-delimited json message) may be
 * .why = a caller cannot flood the server's reassembly buffer without bound; a
 *   frame past this cap is refused with a NACK rather than buffered forever
 */
export const CLONE_WIRE_FRAME_MAX_BYTES = 1_048_576; // 1 MiB — generous for a message, bounded

/**
 * .what = the max number of messages the single-writer queue holds before it
 *   refuses new ones with a NACK
 * .why = the say-side hard twin of the enroll-side soft accrual warn — a runaway
 *   sender is bounded, so a slow brain never grows an unbounded backlog
 */
export const CLONE_WRITE_QUEUE_MAX_DEPTH = 128;
