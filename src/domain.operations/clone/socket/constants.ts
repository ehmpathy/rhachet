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
 * .what = the bracketed-paste markers that fence a MULTI-LINE dispatch — the terminal
 *   protocol's "these bytes are pasted text: insert them, interpret no key"
 * .why =
 *   - a raw `\n` (or `\r`) submits the message; a booted claude commits the buffer and
 *     sends at the first newline. so a multi-line message written verbatim would submit
 *     only its FIRST line and drop the rest
 *   - inside the markers claude's input reader inserts every byte LITERALLY, newlines
 *     included, and interprets no keystroke — so the whole block lands in the input box
 *     and the separate CLONE_SUBMIT `\r` commits it as ONE turn. measured real-opus
 *     v2.1.87 2026-09-17: three lines land verbatim across three rendered rows, with no
 *     marker text and no escape residue in the box or the recorded turn
 *   - the two rejected alternatives, and why, are recorded on asCloneDispatchFrame —
 *     `\x1b\r` silently drops every line but the last; `\` + CR leaves a literal `\` at
 *     the end of each line, a corruption of the caller's message
 *   - they are introduced at FRAME time, past isSafeCloneDispatchInput, so a caller can
 *     never inject a bare ESC themselves (the gate rejects that); only a plain `\n` in
 *     the caller's message triggers the wrap here, code-controlled
 */
export const CLONE_PASTE_OPEN = '\x1b[200~';
export const CLONE_PASTE_CLOSE = '\x1b[201~';

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
 * .what = the BUDGET awaitCloneSubmitReady waits for the written content to appear in the
 *   input box before it submits anyway — a bound on an OBSERVATION, never a blind sleep
 * .why =
 *   - the submit now fires the moment the daemon SEES the content committed, so this
 *     budget is only ever spent when the box never shows it. an early exit is the common
 *     case, so a generous budget costs a healthy dispatch zero
 *   - it is set well above the retired blind delay because that delay was the defect: a
 *     50ms floor lost a 3-line bracketed paste outright (measured 2026-09-17), and no
 *     safe blind value exists — the commit time is the brain's, not ours to predict
 */
export const CLONE_SUBMIT_READY_BUDGET_MS = 5_000;

/**
 * .what = the gap between two box reads while awaitCloneSubmitReady waits for the commit
 * .why = each read renders the emulator grid and classifies it, so a tight spin would burn
 *   the daemon's cpu against a busy brain; 25ms is far below the render latency a human
 *   perceives, so the submit still fires within a frame of the commit
 */
export const CLONE_SUBMIT_READY_POLL_MS = 25;

/**
 * .what = the window awaitCloneSubmitTaken watches for the message to LEAVE the input box
 *   after a submit `\r`, before it re-sends the `\r`
 * .why =
 *   - a taken submit clears the box within a frame or two, so a healthy dispatch exits this
 *     window on its first polls and pays almost none of it
 *   - a fresh claude TUI still draws its boot animation when the first say lands; the content
 *     commits, yet the one `\r` is swallowed and the message sits `buffered` (measured CI
 *     2026-10-08, claude-code 2.1.292, brain-dir-boot [t3]). this window is how long the
 *     daemon waits before it calls the `\r` lost
 */
export const CLONE_SUBMIT_TAKEN_WINDOW_MS = 1_500;

/**
 * .what = the max count of `\r` re-sends awaitCloneSubmitTaken makes after the first submit
 * .why = a bare `\r` appends no text, so a re-send cannot duplicate the message; the bound
 *   keeps a box that never clears (a brain that refuses input) from a resend loop, and the
 *   verdict channel still reports what landed
 */
export const CLONE_SUBMIT_RESEND_MAX = 2;

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
 * .what = the BOUND on the per-connection same-user auth gate — past it the connection is
 *   NACK'd with a named reason rather than held silent
 * .why =
 *   - 🔴 the accept path writes NO frame until that gate resolves, and the gate shells out
 *     to `ss -xp` (a scan of every unix socket on the host, each mapped to the pid that
 *     holds it) once per connection. so an unbounded gate is an unbounded, unobservable
 *     silence — the client sees a connected socket that never answers, and falls to its 30s
 *     wedge timer with no cause to report (`rule.forbid.failhide`)
 *   - measured 2026-09-18, an 11-suite clone acceptance tier against 3 live brains: a joker
 *     dispatch wedged at 30s with `acksSeen: []` and `silentMs: 30092` — the server never
 *     acked at all, so the stall sat BEFORE the first frame, which is exactly this gate
 *   - it sits ABOVE `getSocketPeerCred`'s own 5s `execAsync` timeout deliberately: a healthy
 *     lookup settles in tens of ms, and a slow one is already refused at 5s. so this bound
 *     fires ONLY when that inner timeout failed to settle the promise, and the value is
 *     derived from the inner bound rather than guessed from observed latency
 *     (`rule.forbid.time-assumptions`)
 *
 * ⚠️ this bound did NOT cure the 30s wedge above, and the record says so. the very next tier
 *   run reproduced it — `acksSeen: []`, `silentMs: 30013` — with this bound live and unfired, so
 *   the stall does not sit in this gate (a fired bound would have NACK'd at 8s). what it DOES
 *   close is a real failhide: an unbounded, unnamed wait before the accept path writes its first
 *   frame. kept on that merit alone (`rule.forbid.mechanism-inferred-from-outcome` — a bound
 *   honored is not a fix demonstrated). ⇒ fulcrum F32 carries the refutation
 */
export const CLONE_AUTH_GATE_TIMEOUT_MS = 8_000;

/**
 * .what = how often the daemon's loop-lag watch wakes, in ms
 * .why = the watch measures its OWN lateness, so this is a sample rate rather than a bound.
 *   one timer callback per second is free against a daemon that already parses a pty stream,
 *   and it reports a stall within one period of the stall's end — fast enough that the line
 *   lands in the same log window as the client's wedge report
 */
export const CLONE_LOOP_LAG_TICK_MS = 1_000;

/**
 * .what = the drift past which the loop-lag watch reports a tick, in ms
 * .why =
 *   - a HEALTHY loop drifts by a scheduler quantum — single-digit ms — and a pty burst can
 *     add tens. so a bound three orders above that keeps the channel silent until a real
 *     stall lands; a chatty diagnostic is one an operator learns to skip
 *   - it is set far BELOW the client's 30s wedge timer deliberately: the point of the line is
 *     to be already in the log when the client reports the wedge, so the two can be read
 *     together and the cause is named rather than inferred
 *     (`rule.forbid.mechanism-inferred-from-outcome`)
 */
export const CLONE_LOOP_LAG_THRESHOLD_MS = 2_000;

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

/**
 * .what = the poll interval floor — a caller may SLOW the poll but never speed it below this
 * .why = the case=5 race-guard (`cyclesElapsed >= 1`) reserves the first cycle for the
 *   transcript to settle; that margin is a TIME window, so a poll interval below the proven
 *   default would shrink it and an idle in-flight release could read `enqueued` (the case=5
 *   regression). 250ms is the proven interval — the CLI default, the value acceptance case=5
 *   passes at — so the interval floors here and the `pollMs` param can only raise it, never
 *   shrink the margin the guard rests on (r011-i007-n5)
 */
export const CLONE_SAY_POLL_MS_MIN = 250;

/**
 * .what = the per-probe reply bound for the observe loop, in ms
 * .why = each cycle probes the socket via `getCloneInputStateOrBlind`, which rode
 *   `getCloneInputState`'s CLONE_PROBE_REPLY_DEFAULT_MS reply default. under host load — the
 *   F14 auth-gate `ss` shell-out — one probe could then eat a third of the 15s budget, which
 *   cuts ~60 intended samples to 2–3 right where the case=5 race-guard most needs granularity
 *   (r011-i007-n2). 1000ms is well above a healthy probe (a local socket exchange is tens of
 *   ms, so no false probe-blind on a slow-but-live host) and well below that default, so a
 *   stuck probe degrades probe-blind fast and the loop keeps its cadence. the broader
 *   per-tick rework (reconnect + auth + grid + relink) stays F14's dedicated PR
 */
export const CLONE_SAY_PROBE_REPLY_MS = 1_000;

/**
 * .what = the DEFAULT reply bound one `getCloneInputState` probe waits for its single frame
 * .why =
 *   - a probe is a READ that bypasses the write queue, so a healthy reply is a local socket
 *     exchange — tens of ms. this default is the outer bound for a host under real load,
 *     never an expected latency
 *   - the observe loop deliberately does NOT ride it: it passes CLONE_SAY_PROBE_REPLY_MS
 *     instead, because one probe at this bound would eat a third of the say budget and
 *     starve the case=5 race-guard of samples. so the two values are a PAIR — a generous
 *     default for a one-shot caller, a tight override for the cadence-sensitive loop
 */
export const CLONE_PROBE_REPLY_DEFAULT_MS = 5_000;

/**
 * .what = the DEFAULT bound `connectToClone` waits for the socket to answer the connect
 * .why = a unix-domain connect to a live daemon settles in single-digit ms, so this bound is
 *   an outer edge rather than an expected wait — past it the socket is treated as dead and the
 *   caller gets a named ConstraintError (retry, or re-enroll) rather than a silent hang. it
 *   sits well BELOW the client's 30s wedge timer so a dead socket is named by its own cause
 *   rather than absorbed into a wedge report (`rule.forbid.failhide`)
 */
export const CLONE_CONNECT_TIMEOUT_MS = 2_000;

/**
 * ⚠️ no `constants.latency.ts` file sits beside this one, deliberately. the say/observe
 *   latency budget lives HERE, with every other wire tunable, because a human who tunes the
 *   poll cadence reads the submit delay and the wedge window in the same pass — they share a
 *   reader, which is the same test that sent the bind bounds away. a third constants file in
 *   this one directory would fragment the budget it was meant to consolidate.
 */

/**
 * ⚠️ the BIND-lifecycle constants are not here — they live in `./constants.bind`.
 *   each const above tunes the WIRE; a bind bound and its fault marker answer a different
 *   question and share no reader with these.
 */
