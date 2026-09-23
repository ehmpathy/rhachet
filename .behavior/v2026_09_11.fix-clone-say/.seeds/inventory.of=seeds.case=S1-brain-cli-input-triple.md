# seed S1 — the brain-cli input triple, and say-leverages-get

## .said

verbatim, 2026-09-13:

> i'm thinking more like rhx clone say should leverage rhx clone get; and rhx clone get should make it clear if the input is
>
> 1. buffered
> 2. enqueued
> 3. released
>
> where
>
> buffer = input buffer, where the stdin goes
>
> queue = the queue above the input box, after yo upress enter, if the repl was at work - it'll sit there until released
>
> release = delivered to the brain repl, moved out of queue
>
> ---
>
> it should be clear that messages can leave the queue and into the repl at different rates too
>
> so there may be subests of the queue that get released at a time
>
> ---
>
> also, that the input buffer migt be dirty. e.g., a human may have started a message already. in those cases, it should failfast on apply and instead require a --force to force over the humans input
>
> ---
>
> and rhx clone get should make it clear whether the screen has any enqeueud or buffered input; and rhx clone say should make it clear whether the input was buffered, enqueued, or released already. and make it possible to await enqueue or await release before it halts, via use of rhx clone get under the hood.
>
> also, we need to enbrief this tripple of brain-cli input statuses

## .settled

the read channel is a **three-state lifecycle of one message**, not a flat six-verdict set:

- **buffered** — the message sits in the input buffer, where stdin goes; unsubmitted
- **enqueued** — after Enter, if the repl was at work, the message waits in the queue above the input box until released
- **released** — the message is delivered to the brain repl and moved out of the queue

the transitions and their nuances:

- a message moves `buffered → enqueued → released`; if the repl is free it passes through fast
- the queue releases in **subsets** — a message can leave the queue into the repl at a different rate than its neighbours, so part of the queue may release while part stays
- the input buffer may be **dirty** — a human may have begun a message — so an apply **failfasts** and requires `--force` to write over the human's input

the architecture and the surfaces:

- `say` **leverages** `get` under the hood — `get` is the read channel `say` observes state through
- `get` reports whether the screen carries any enqueued or buffered input
- `say` reports which state the message reached — buffered, enqueued, or released
- `say` can **await enqueue** or **await release** before it halts, by a poll of `get`

the vocabulary is a **triple of brain-cli input statuses** and is owed a durable brief.

## .landed

- `.agent/repo=.this/role=any/briefs/define.brain-cli-input-states.md` — the enbrief of the triple
- `1.vision.yield.md` → `.the wisher's redirect` — the fold into the vision (state + refusals; say-leverages-get; `--await`; dirty-buffer `--force`)
