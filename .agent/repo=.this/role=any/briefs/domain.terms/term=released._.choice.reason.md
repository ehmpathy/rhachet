# domain.term.choice.reason: released

## .etymology

latin *relaxare* — "to loosen, let go." the message was **held** in the brain's queue above the
input line, and `released` names the moment it is let go INTO the repl — dequeued and taken as a
turn. the word keeps the queue metaphor of the input triple intact: a message is `enqueued`, then
`released` from that queue.

## .why not `landed`

`landed` was the word a prior boolean shipped — `getCloneSubmitLanded` polled the transcript and
returned "did the submit land." it read fine for a boolean but fails as a verdict word for two
reasons:

- it names no place. `released` sits in a triple (`buffered → enqueued → released`) and its sense
  is *"out of the queue"* — `landed` has no such neighbours, so it cannot part "the brain took it"
  from "the brain holds it"
- it collides with no word and therefore teaches none. the whole value of the verdict set is
  the boundary each word draws; `landed` draws none

the vision coins `released` as the success verdict. the prior boolean `getCloneSubmitLanded` was
superseded by `getCloneSayObservation` (the count-based poll that reads the transcript rise) and
removed as dead code. so `landed` is not banned from the codebase; it is banned as a **synonym of
the verdict** `released`.

## .disputes

### dispute: `released` vs `delivered` — raised at design — status: RESOLVED (keep both; distinct axes)

- claim = `say` already returns `delivered`, so a success verdict could reuse it
- counter = `delivered` means *the bytes reached the pty* and is true the instant the socket
  acks — long before the brain acts. the wish exists because `delivered` was read as receipt when
  it only proved transmission. a success verdict that reused the word would re-commit the exact
  conflation the wish repairs
- resolution = `delivered` stays as the machine-channel boolean (its extant sense, V13); `released`
  is the receipt verdict beside it. one say outcome carries both: `{ delivered: true, verdict:
  'released' }`. they are not synonyms — they are two claims about one dispatch, on two axes

## .evidence

### the ranking, shipped in the compute

`computeCloneSayVerdict.ts` checks the transcript rise BEFORE any screen read, because a rise is
the stronger observation:

```ts
// released — the brain took it: the transcript gained the user turn it writes ON submit.
if (input.transcriptRose)
  return { verdict: 'released', reason: null, probe, delivered: true };
```

### the first-cycle grace, that keeps the idle path honest

on a near-instant brain the box can clear and the echo can land on screen (the enqueued shape) an
instant before the user turn reaches the jsonl. a return on the first poll cycle would read that
in-flight release as `enqueued` — the case=5 regression. so the observe loop reserves its first
cycle for the transcript to settle (`getCloneSayObservation.ts`), and an idle say reads
`released`, byte-for-byte, as case=5 mandates.

### invariants

- **every `released` is `delivered`; not every `delivered` is `released`.** the containment is
  strict and one-way — a message can reach the pty (`delivered`) yet sit `enqueued` or `buffered`,
  never taken
- **`released` outranks every screen verdict.** a transcript rise wins over an enqueued-looking box

## .see also
- `term=submit._.choice._.md` — the act; `released` is its resulting state
- `term=enqueued._.choice._.md` — the prior state in the triple
- `term=buffered._.choice._.md` — the first state in the triple
- `.behavior/v2026_09_11.fix-clone-say/1.vision.experience.case=5.the-idle-baseline-must-not-regress.md`
