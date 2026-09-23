# define.brain-cli-input-states

## .what

a message dispatched to a brain-cli clone passes through **three states**, in order. the triple is
the ubiqlang for *where a message sits* on the clone's screen, and it is what `clone get` reads and
`clone say` reports.

```
buffered  →  enqueued  →  released
```

| state | where the message sits | how it got there |
|---|---|---|
| **buffered** | the **input buffer** — where stdin goes, the input box at the bottom of the screen | written, not yet submitted |
| **enqueued** | the **queue** above the input box | submitted (Enter) while the repl was at work; waits here until released |
| **released** | **out of the queue, in the repl** — the brain has it | the repl freed and took it |

## .the transitions

- a message moves `buffered → enqueued → released`
- if the repl is free at submit, it passes through `enqueued` fast — `buffered → released` in one motion
- the queue releases in **subsets** — a message can leave the queue into the repl at a different rate
  than its neighbours, so part of the queue may release while part stays. `released` is per-message,
  never per-queue

## 🔴 .how each state is READ — the transcript cannot part `enqueued` from `released`

the brain writes a user turn to its transcript jsonl **at SUBMIT**, never at release. so a transcript
rise proves the message left the buffer, and says naught about whether the repl took it.

| the read | what it proves |
|---|---|
| a **transcript** rise | `submit` — satisfied by `enqueued` and `released` alike |
| the **dim queue hint** on screen | the brain's queue is **non-empty** |
| a rise **plus** an empty queue | `released` — the repl took it |
| a rise **plus** a non-empty queue | `enqueued` — the brain holds it |

⇒ **so the screen read is what parts the two, and the transcript alone cannot.** a `released` verdict
is a rise gated on an empty queue; the rise on its own would report every busy peer's hold as a take.

the discriminator is a hint row the brain draws **inside** the input-box band, fully dim, present
exactly while the queue is non-empty — read as a PAIR: present in the full content AND absent from
the bright-only content. the dim clause is the safety: the brain dims what IT drew, so a human cannot
forge the state by typing the phrase.

🟡 **measured 2026-09-18** against a live peer mid-print: a message visibly held in the queue region
raised its own transcript count within 678ms. `getCloneSubmittedCount.ts:12-15` had already stated
this in prose — the brain records each user turn the moment it is submitted, before the assistant
replies.

## .the dirty buffer

the input buffer is shared with the human. a human may have begun a message, so the buffer is
**dirty** — it holds content nobody dispatched.

- an apply against a dirty buffer **failfasts** — it does not paste over the human
- `--force` is the deliberate override: it writes over the human's input, at the human's cost

## .what each surface owes

| surface | what it reads | state |
|---|---|---|
| **`clone say`** | the input-state probe, before and after its write — reports which state the message reached: **buffered**, **enqueued**, or **released** | **shipped** |
| **`clone say --await enqueue\|release`** | polls that same probe until the target state or the bound | **shipped** — `invokeCloneSay.ts:71,94-97` |
| **the CLI `clone get`** | the transcript, never the screen's buffered/enqueued state | 🟡 **the F15 target** — see below |

🟡 **the probe is a say-INTERNAL read today.** a standalone `clone get` input-state surface — one that
reports a clone's input state to a caller with no dispatch of its own — is a wisher-owned scope call,
itemized as fulcrum F15 (kin F13). so the triple above is the ubiqlang plus the say-internal contract;
it is not a claim about what `clone get` returns.

⇒ the two are independent: F15 governs only the *standalone* read. the `--await` poll on `say` ships
regardless of how F15 rules.

## .the terms

each state word is a domain term owed a `term=$x._.choice._.md` cluster once it enters a contract:

- `buffered` — the input-buffer state
- `enqueued` — the above-the-box queue state
- `released` — the in-repl state

related extant terms: `submit` (the act that carries a message out of the buffer), `held` (a
daemon-memory observation, a different domain).

## .see also

- `term=buffered._.choice._.md` · `term=enqueued._.choice._.md` · `term=released._.choice._.md` — the three state words, each with its etymology
- `term=submit._.choice._.md` — the act that carries a message out of the buffer
- `define.invariant.clone-say-delivery` — the delivery contract the triple refines
