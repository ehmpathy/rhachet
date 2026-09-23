# domain.term.choice.reason: enqueued

## .etymology

french *queue* — "tail." to enqueue is to place at the tail of a line. `enqueued` names the state
of a message that sits in the brain's input queue above the box, at the tail behind the turn in
flight. it is the middle of the triple: past `buffered` (in the box), short of `released` (out of
the queue).

⇒ the past-participle form is what makes it a STATE rather than an act: one word, one sense, and it
slots into the triple beside `buffered` and `released` with the queue metaphor intact.

## .disputes

### dispute: `enqueued` (verdict) vs `queued` (wire ack) — raised at design — status: DEFERRED to wisher (F01)

- claim = the wire ack already carries `queued` (`asCloneDispatchAck`), and a reader may read the
  verdict `enqueued` and the ack `queued` as one concept spelled two ways — a synonym drift
  `rule.forbid.domain-term-ambiguity` would block
- counter = they name **different queues**. the ack `queued` is our socket's write-queue that
  accepts the dispatch (`genCloneWriteQueue`); the verdict `enqueued` is the BRAIN's input queue
  that holds the submitted message. a message is `queued` in our queue, then `delivered` to the
  pty, then `enqueued` in the brain's queue, then `released`. four states, four words — no two the
  same
- resolution = the split is real, so this cluster keeps `enqueued` and does NOT forbid `queued`.
  whether the wire ack word should be renamed to remove the surface rhyme is the wisher's call —
  recorded as F01 in `.fulcrums/inventory.of=fulcrums._.md`. best-guess before a wisher call: no
  forced rename — the two words already read distinct in context, and a rename touches a live ack
  contract

## .evidence

### the three-condition guard, shipped in the compute

a single screen read would call an eaten paste (case=6) `enqueued`. the compute demands all three:

```ts
// computeCloneSayVerdict.ts
if (
  input.screen.focus === 'input' &&
  input.screen.input === 'clear' &&
  input.screen.countOnScreenRose
)
  return { verdict: 'enqueued', reason: null, probe, delivered: true };
```

### invariants

- **`enqueued` promises HOLD, never DELIVERY.** the turn it waits behind can abort, and the brain's
  queue dies with the process — so the no-re-send guarantee is bounded by that abort
- **`released` outranks `enqueued`.** a transcript rise wins, so a message that is truly taken never
  reports the weaker hold state (see `term=released`)
- **the wire `queued` and the verdict `enqueued` name different queues.** they are not synonyms

## .see also
- `term=released._.choice._.md` — the next state in the triple
- `term=buffered._.choice._.md` — the prior state in the triple
- `.behavior/v2026_09_11.fix-clone-say/1.vision.experience.case=1.queued-nudge-at-a-busy-driver.md`
- `.fulcrums/inventory.of=fulcrums._.md` — F01, the wire-ack rename call the wisher owns
