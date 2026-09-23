# domain.term.choice.reason: cli.queue

## .etymology

why `queue`: a queue is a line of items awaited in order. the brain-cli renders its held messages
under a literal *"queued messages"* label, so the word is the subject's own — adopted, never coined.

named by the wisher, 2026-09-21, as a value of `rhx clone get --what buffer|queue|story`, and the
wisher's own description of the state used the same word: *"shows in the queued messages region."*
so the contract and the rendered screen agree, which is the strongest evidence a term can carry
(`rule.require.persist-domain-term-evidence`).

chosen over the rejected peers:

- `backlog`  — implies a debt that accrued past a plan. the queue is ordinary flow control, not a
               shortfall.
- `outbox` / `inbox` — each imports a mail model with a sender and a recipient. the queue is inside
               one process, and its items are not addressed anywhere.
- `waitlist` — implies a contest for a scarce slot. every queued message is released; none is turned
               away.
- `holdpen`  — implies indefinite detention. a queued message is released as the repl frees, usually
               within one turn.

🟡 the -ing forms of *await* and *hold* were never candidates — `rule.forbid.gerunds` bars them
outright, for the reason this cluster exists to serve: a gerund names neither the place nor the state
unambiguously, and `queue`/`enqueued` need exactly that split.

## .disputes

none. the word is the subject's own render text, and its one live collision is bounded by the
boundary qualifier — see below.

## .evidence

### the overload the boundary qualifier settles

this repo already declares a `queue` concept in its own process: `genCloneWriteQueue` serializes
pty writes so two dispatches cannot interleave. that is a queue of **bytes we own**, in the daemon.

`cli.queue` is a queue of **messages the brain owns**, on the brain's screen. the two sit on
opposite sides of the socket.

| the queue | whose | what it holds | its failure mode |
|---|---|---|---|
| `genCloneWriteQueue` | ours, in the daemon | pty writes awaited | a dequeue exit that drops the latch leaves the clone deaf (V15) |
| `cli.queue` | the brain's, on screen | submitted messages awaited | a killed turn takes the whole queue with the process |

⇒ `rule.require.boundary-qualified-terms` is what makes both expressible: one word, two boundaries,
no overload. an unqualified `queue` would have been the exact ambiguity
`rule.forbid.domain-term-ambiguity` grades a blocker.

### the gate, and why an empty read is not an empty queue

measured 2026-09-22 against the `[case9]` grid in
`src/domain.operations/clone/socket/genCloneSocketServer.integration.test.ts`:

```
❯ Print each integer from 1 to 60     ← a RELEASED turn's echo
● 1                                    ← its output
  2
────────────────────────────────────    ← a rule row
❯ SENTINEL-get9                        ← the buffer
────────────────────────────────────
```

the rows above the rule hold a released turn. on a screen where a message were queued, a queued
message would render in those same rows.

⇒ so the rows alone cannot tell the two apart, and `computeCloneInputContent` gates its queue read
on the screen's `queued` classification. the clamp asserts `queue: []` on this grid **and** that the
released turn's text (`Print each integer`, `● 1`) never crosses the wire.

⇒ 🔴 that makes an empty `queue: []` a **gate result**, never an emptiness claim. a reader who takes
it as *"the queue is empty"* has read a fact the operation never asserted.

### the triple

`buffer` and `queue` are the two screen surfaces of the input triple
(`define.brain-cli-input-states`):

```
buffered  →  enqueued  →  released
  buffer      queue       transcript
```

⇒ one surface per state. the release between `queue` and `transcript` is per-message and in subsets,
which is why `enqueued` is graded on one message rather than on the strip.
