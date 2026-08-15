# define.invariant.clone-say-delivery

## .what

a `say` reports **`delivered`** only after its **whole** message has reached the brain-cli — the
entire content written in one pty write, then exactly one submit `\r` in its OWN later pty read. the
submit waits a length-scaled delay so a booted brain-cli TUI commits the pasted content before the
Enter, and never rides the same read as the content (which would submit an empty line). a false
`delivered`, or a lost message, is not allowed.

## .invariant

for every dispatch the server acknowledges `delivered`:

```
say delivered  ⟹  the whole message was written to the child in ONE pty write,
                  then — in its OWN later pty read — exactly one submit `\r`
```

and the commit-safety schedule that holds the submit back until the paste has committed:

```
submit delay  =  computeCloneSubmitDelay({ messageLength })   (scales with length; floor 50ms)
content        =  ONE bulk pty write                          (never split, never bundled with `\r`)
```

the contrapositive is the honesty guard:

```
the full content write + submit did NOT complete  ⟹  say NACK'd / times out (fail loud), never `delivered`
```

## .why

three failure modes this invariant forecloses, all learned the hard way:

- **the bundled-submit** — a `\r` that rides the SAME pty read as the last content byte submits an
  empty/partial line, so the message stays unsent (the original dogfood defect). the submit is its
  own keystroke in its own read, AFTER the content — one message written, then one deliberate `\r`.
- **the raced-submit** — the submit delay is NOT a free knob to shrink. a booted claude commits a
  paste asynchronously, and a LARGER paste takes LONGER to commit; if the `\r` lands before the
  commit, the Enter submits an empty line and the message is never sent (dogfood 2026-08-13: a
  3728-char bulk write with a flat 8ms pre-submit delay wrote whole but its `\r` raced the commit
  and was lost; the transcript self-verify caught it and failed loud, never a false `delivered`). so
  the delay SCALES with length — `computeCloneSubmitDelay` — long enough that a large paste has
  committed before the Enter, floored well above 8ms for short messages.
- **the false `delivered`** — the `delivered` ack fires ONLY after the whole content write AND the
  submit complete. a caller (a cron, a comms relay) that reads `delivered` may trust the message
  landed; a premature ack would let it believe a dropped message was received. so `delivered` is a
  hand-off proof (the bytes left the queue, whole, to the child's write), and a stalled or exited
  clone yields a fail-loud NACK / wedged-timeout instead — never a green lie.

the content is written whole in one pty write because a booted claude ACCEPTS a bulk content write
— char-at-a-time keystroke injection was proven unnecessary (real-haiku dogfood, 2026-08-13). the
one part to time-gate is the SUBMIT, not the content.

## .evidence

- **the write loop** — `src/domain.operations/clone/socket/genCloneSocketServer.ts`: bulk-writes the
  framed message in one `input.write`, then — after `computeCloneSubmitDelay({ messageLength })` — a
  single `CLONE_SUBMIT` `\r`; the queue AWAITS the whole sequence before the next message.
- **the submit-delay policy** — `src/domain.operations/clone/socket/computeCloneSubmitDelay.ts`: a
  pure transformer, `max(floor, min(cap, length × per-char))` off the `constants.ts` trio
  (`CLONE_SUBMIT_DELAY_FLOOR_MS = 50`, `CLONE_SUBMIT_DELAY_PER_CHAR_MS = 0.3`,
  `CLONE_SUBMIT_DELAY_CAP_MS = 2000`). the single owner of the pre-submit pause, shared with
  `computeCloneWedgedTimeout.ts` so the in-flight window can never drift from the real send time.
- **the two-phase ack** — `src/domain.operations/clone/socket/genCloneWriteQueue.ts` +
  `sayClone.ts`: `delivered` fires only after the write completes; a `rejected` NACK or a wedged /
  connect timeout fails loud (`ConstraintError`), never a false success.
- **the proofs** —
  - `computeCloneSubmitDelay.test.ts`: the scaled policy (short→floor, 3728→1118ms in the
    proven-safe band, huge→cap)
  - `computeCloneWedgedTimeout.test.ts`: the in-flight window always exceeds the true send budget
    (the submit delay), derived off the SAME policy so it never drifts
  - `genCloneSocketServer.integration.test.ts` case1 (one bulk content write + one submit), case3
    (concurrent dispatches serialized, never interleaved), case12 (the whole message written in one
    pty write with a single submit — delivery preserved at length)
  - `blackbox/cli/clone.realbrain.acceptance.test.ts`: a **real** claude receives the message whole
    and submits it (its final sentinel returns through `get`) — the delivery invariant proven
    against a live brain, not only the stub
  - `blackbox/cli/clone.saybulk-probe.realbrain.acceptance.test.ts`: the bulk-write clamp — a real
    haiku receives a SHORT and a LONG (~3728-char) bulk-written message whole and submits each
- **settled by** — the bulk-write dogfood (real-haiku, 2026-08-13). the content write is bulk and
  accepted; only the submit is time-gated, and the delivery self-verify is paramount.

## .enforcement

- a `\r` bundled into the last content byte (same pty read as the content) = **blocker** (submits an
  empty line, message left unsent)
- a fixed submit delay that does not scale with message length = **blocker** (a large paste's commit
  outlasts a small delay, so the submit races the commit and the message is lost)
- a `delivered` ack fired before the full content write + submit complete = **blocker** (a false
  success)

## .see also

- `define.invariant.clone-socket-brain-cli-only.md` — the security invariant (a say reaches only a
  verified brain-cli); this invariant governs HOW that say is written once admitted
- `src/domain.operations/clone/socket/computeCloneWedgedTimeout.ts` — the length-scaled in-flight
  window that shares the submit-delay policy, so a large-but-healthy send is never falsely called wedged
