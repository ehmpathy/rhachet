# domain.term: enqueued

term.chosen   = enqueued
term.kind     = adj
term.synonyms.forbidden:
- staged
- backlogged
- deferred
- unreleased

⚠️ **`queued` is NOT listed as a forbidden synonym — it names a DIFFERENT queue.** the wire ack
`queued` (`asCloneDispatchAck`) means *the socket accepted the write into our dispatch queue*; the
verdict `enqueued` means *the brain holds the message in ITS input queue above the box*. two
queues, two words — a near-collision the wisher rules on (F01), not a drift this cluster settles.

⚠️ **`held` is a DISTINCT keyrack term, never a synonym here.** `term=held` names a credential a
daemon carries in memory; it lives in the keyrack bounded context and answers a different
question. the vision's prose "held above the input line" is descriptive, and the canonical verdict
word is `enqueued`.

## .what

**the brain holds the message above the input line, not yet taken.** the middle state of the input
triple (`buffered → enqueued → released`) — the message was submitted while the repl was at work,
so it waits in the queue until the brain releases it.

it is a success verdict: exit 0, stdout, the line `😶🎙️ enqueued for <addr>`. a caller told
`enqueued` must NOT re-send — the brain has it.

## ⚠️ .the boundary — `enqueued` promises HOLD, never DELIVERY

`enqueued` says the brain holds the message; it does NOT promise the brain will act on it. the turn
it waits behind can be aborted — a ctrl-C, a crash, a `clone prune` — and the brain's queue dies
with the process. so the no-re-send guarantee is bounded by that abort risk, and a caller that
must survive an abort verifies later rather than trust the hold forever.

## ⚠️ .the boundary — all THREE conditions, or an eaten paste reads as enqueued

the verdict fires only on `focus: 'input'` AND the input region clear AND the screen count rose. a
single condition would mis-read a pasted-over human entry (case=6) as enqueued. the three together
prove the message left the box (region clear) and is now a queued turn (count rose) on a screen no
modal holds (focus input).

## .refs
- `src/domain.operations/clone/socket/computeCloneSayVerdict.ts`     # the three-condition `enqueued` branch
- `src/domain.operations/clone/socket/computeCloneSayReport.ts`      # the `😶🎙️ enqueued for <addr>` success line
- `src/domain.operations/clone/socket/getCloneSayObservation.ts` # the enqueued-shape short-circuit + first-cycle grace
- `src/domain.operations/clone/socket/asCloneDispatchAck.ts`         # the wire `queued` ack — the OTHER queue (F01)

## .reason
see the ref-level cluster beside this choice:
- `term=enqueued._.choice.reason.md` — etymology, the two-queue collision, the three-condition guard
