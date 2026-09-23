# domain.term.choice.reason: buffered

## .etymology

*buffer* — a region that holds bytes between two stages. the input box is exactly that: the region
where stdin collects before a submit hands it on. `buffered` names the state of a message that
reached the buffer and stopped there — written, never submitted. it is the head of the triple,
before the message enters any queue.

⇒ so the word keeps the triple internally consistent: `buffered`, `enqueued`, and `released` each
name a PLACE the message sits, never an act that failed to occur to it.

## .why not `uncommitted` / `unsent` / `typed` / `drafted`

- `uncommitted` — the closest peer, and it names the negative (what did NOT happen) where the
  triple names each state for where the message IS. `buffered` says *in the buffer*
- `unsent` — a `say` DID send the bytes (they are `delivered` to the pty); only the submit did not
  take. `unsent` would contradict the machine channel's `delivered: true`
- `typed` — implies a human at a keyboard; a `say` writes the bytes programmatically
- `drafted` — implies a deliberate save-for-later; the buffered state is a submit that failed to
  land, never a draft

## .evidence

### the residual-of-two order, shipped in the compute

`enqueued` is checked before `buffered`, so `buffered` fires only when the text never left the box:

```ts
// computeCloneSayVerdict.ts — buffered follows the enqueued branch
if (input.screen.countInInputRose)
  return {
    verdict: 'buffered',
    reason: 'input-region-holds-text',
    probe,
    delivered: true,
  };
```

### the re-send hazard, in the copy

`buffered` is the one failure verdict where a blind re-send actively harms: the bytes are in the
box, so a second send APPENDS and wedges the line. the report copy says so — *"do NOT re-send (it
would append) — verify the clone accepts a submit, or retry with --await release."*

### invariants

- **`buffered` is `delivered`.** the bytes reached the pty; only the submit did not take. so the
  machine channel reads `{ delivered: true, verdict: 'buffered' }`
- **`buffered` reads a REGION, never a row.** a multi-line message spans several rendered rows (its
  newlines land in the box via bracketed paste); the count is region-scoped so `buffered` stays
  reachable on multi-line text
- **`enqueued` outranks `buffered`.** a clear region with a screen-count rise is the stronger state

## .see also
- `term=enqueued._.choice._.md` — the next state; the text left the box into the queue
- `term=released._.choice._.md` — the terminal state; the brain took it
- `term=submit._.choice._.md` — the act whose failure leaves a message `buffered`
