# domain.term.choice.reason: socket.exchange

## .etymology

**exchange** is the plain word for a two-way pass: one side sends, the other returns. that is the
whole concept — a client half connects, sends one framed request, and reads a framed reply stream to
a settle. it names the WHOLE round, both directions, which is what parts it from the words below.

`socket` is the boundary, so the term reads unambiguously against any other exchange the repo might
later name (a keyrack exchange, a radio exchange).

## .why the other candidates were rejected

| rejected | why |
|---|---|
| `request` | names the send alone, and drops the reply. the exchange's whole content is that a reply comes back and a terminal predicate reads it — a word that hides the return cannot carry it |
| `roundtrip` | already a declared term here (`term=roundtrip`), for the say's own dispatch-and-confirm round. to reuse it for the transport would overload one word onto two concepts — `rule.forbid.domain-term-ambiguity`, a blocker |
| `transaction` | implies atomicity and rollback the socket has none of — a half-sent request is not undone, it just faults. the word would promise a guarantee the concept does not hold |
| `session` | already forbidden repo-wide as an overloaded term; and a session is a HELD connection across many exchanges (see the persistent-poll dream), which is a distinct concept this must not pre-claim |

## .evidence

**the concept carries real weight — it was extracted from two hand-replicated copies, not coined for
tidiness.** `getCloneInputState.ts` and `sayClone.ts` each reimplemented the identical lifecycle:
connect (2000ms default) → a Promise executor with a reassembly buffer + a timer + a first-settle
latch → `finish(act)` = clear timer + destroy socket + run the settle → `socket.on('data')`
reassembly via `asCloneDispatchFrameSplit(CLONE_WIRE_FRAME_MAX_BYTES)` → `socket.once('error')` →
`socket.write(JSON + '\n')`.

the two differed only in three seams the exchange now takes as parameters:

- the **request** payload (`{ kind: 'probe', needle }` vs `{ kind: 'say', message, force }`)
- the **timer** discipline (a fixed reply window vs a window re-armed on each `queued` ack)
- the **terminal predicate** (first frame settles vs loop until a `delivered`/`rejected` phase)

⇒ a protocol change — a heartbeat, a held connection, a new timeout strategy — was a two-place edit
that could silently drift. after extraction it is a one-place edit, and the drift is impossible by
construction.

## .invariants

- an exchange has **exactly one** framed request and reads a framed reply STREAM (a frame may split
  across SOCK_STREAM chunks, or two frames coalesce into one) — so the reply is always reassembled,
  never read as a single `chunk.toString()`
- the exchange **latches on the first settle**: once a `done`/`fail` runs, no later frame in the same
  chunk is dispatched — so a single-frame reader ignores a later frame and a loop reader stops at its
  terminal one, both without a per-caller guard
- the socket has a **single owner** — the exchange connects it, and `finish` is the only path that
  destroys it, so no caller holds or leaks a live handle
- the settle is **idempotent** — the first `done`/`fail` wins and every later one no-ops, so a
  timeout that races a final frame cannot double-settle the promise
