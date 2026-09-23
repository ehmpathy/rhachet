# domain.term.choice.reason: withheld

## .etymology

*withhold* — "to hold back, decline to give." the write was held back at the gate: the server
declined to hand the bytes to the pty because the screen said a write would land somewhere unsafe.
the word names an active, deliberate refusal — not a fault, not a drop, a decision.

## .why not `refused` / `denied` / `dropped` / `suppressed`

- `refused` / `denied` — read as a hard NO with no recourse. two of the three withheld reasons ARE
  amendable (a dirty box clears; a `--force` overrides it), so a word that reads terminal misleads
- `dropped` — implies the message was lost. it was not sent at all (`delivered: false`), so the
  caller still holds it and may re-send safely once the cause clears
- `suppressed` — implies we hid the message from a live channel. the channel was not live — a
  modal held it, or the box was dirty. `withheld` names the gate, not a cover-up

## .why the word carries the safety root

the sharpest reason `withheld` exists is case=6: a `say` must NEVER answer a permission prompt. a
modal on screen means the next `\r` approves a tool call no human approved. `withheld` is the
verdict that refusal produces, and its `modal-holds-focus` reason has NO force path — the pre-check
checks focus before the dirty-region test, so `--force` can never reach a modal.

## .evidence

### the force-path order, shipped in the pre-check

the two focus refusals are checked FIRST, so `--force` overrides only the dirty region:

```ts
// computeCloneDispatchPrecheck.ts
if (input.state.focus === 'modal')
  return { proceed: false, reason: 'modal-holds-focus' };      // no force path
if (input.state.focus === 'unrecognized')
  return { proceed: false, reason: 'focus-unrecognized' };     // no force path
if (input.state.input === 'dirty' && !input.force)
  return { proceed: false, reason: 'input-region-dirty' };     // forceable
return { proceed: true };
```

### the verdict, in the compute

`withheld` is checked first of all verdicts, because a refusal means no write happened, so there is
no rise to read:

```ts
// computeCloneSayVerdict.ts
if (input.refusal !== null)
  return { verdict: 'withheld', reason: input.refusal, probe: 'capable', delivered: false };
```

### invariants

- **`withheld` is the one verdict with `delivered: false`.** no write happened, so a re-send never
  duplicates — the retry contract puts `withheld` in the safe-to-re-send class
- **a `modal-holds-focus` refusal has no force path.** the safety guarantee (V3, case=6) rests on
  the pre-check order, not on caller discipline
- **`withheld` is decided server-side at dequeue.** a client probe before enqueue may be stale by
  the queue depth; only the dequeue read is current at the write

## .see also
- `term=absent._.choice._.md` — the residual verdict, when a write DID happen but no rise held
- `term=released._.choice._.md` — the success verdict; `withheld` is its refusal-before-write mirror
- `.behavior/v2026_09_11.fix-clone-say/1.vision.experience.case=6.never-answer-a-permission-prompt.md`
- `.behavior/v2026_09_11.fix-clone-say/1.vision.experience.case=2.refuse-to-paste-over-a-human-mid-type.md`
