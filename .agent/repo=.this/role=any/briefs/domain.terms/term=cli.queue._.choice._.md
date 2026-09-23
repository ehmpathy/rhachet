# domain.term: queue

term.chosen   = queue
term.kind     = noun
term.boundary = cli
term.synonyms.forbidden:
- backlog
- outbox
- inbox
- waitlist
- holdpen

## .what

**the rows a brain-cli holds SUBMITTED messages in, before its repl releases them.** the strip
directly above the buffer, where a message sits once a submit took it and while a turn is in flight.

it is the SURFACE the `enqueued` state is read off — one of the two values `rhx clone get --what`
takes, beside `buffer`.

## 🚨 .the boundary — `queue` is the SURFACE; `enqueued` is the STATE

| word | kind | what it names |
|---|---|---|
| **`queue`** | noun | the screen rows | the place a submitted message can sit |
| `enqueued` | adj | a verdict on one message (`term=enqueued`) | the fact that it sits there |

⇒ so `--what queue` asks *"show me those rows"*, and an `enqueued` verdict answers *"the message is
in them."*

## 🔴 .the boundary — the read is GATED, and an ungated one reports the WRONG turn

a `--what queue` read is gated on the screen's `queued` classification. an ungated read over the
same rows would report the prior **released** turn, since a released turn's output renders in the
exact rows a queued message would occupy.

⇒ so an empty `queue: []` is a **gate**, never an emptiness claim — it says *"this screen does not
hold a queue"*, which is what the clamp in `genCloneSocketServer.integration.test.ts [case9] [t1]`
asserts.

## ⚠️ .the release is per-MESSAGE, never per-queue

the queue releases in **subsets**. a message can leave at a different rate than its neighbours, so
`enqueued` is a verdict on one message rather than a state of the whole strip.

🟡 and the queue is **volatile**: a ctrl-C, a crash, or a `clone prune` kills the in-flight turn and
the queue with the process. so `enqueued` promises the brain HOLDS a message, never that it will
deliver it — a caller told not to re-send must know that bound.

## ⚠️ .the near-neighbors, and why each stays distinct

| word | its own concept |
|---|---|
| **queue** | the cli's screen rows that hold submitted-not-released messages |
| **buffer** | the rows below it, that hold uncommitted text (`term=cli.buffer`) |
| **write queue** | the DAEMON's serialized pty-write queue (`genCloneWriteQueue`) — our side of the wire |
| **radio queue** | the dispatcher's task broadcast queue — a different bounded context |

🔴 the third row is the live overload to watch. `genCloneWriteQueue` is a queue in **our** process
that serializes bytes into the pty; this term names a strip on the **brain's** screen. the boundary
qualifier is what parts them: `cli.queue` is the brain-cli's, and the write queue is the daemon's.

## .refs
- `src/domain.operations/clone/cli/asCloneGetWhat.ts`                  # the `--what` tuple that publishes it
- `src/domain.operations/clone/screen/computeCloneInputContent.ts`     # the gated read that returns its rows
- `src/domain.operations/clone/screen/computeCloneInputState.ts`       # the `queued` classification the gate reads
- `src/domain.operations/clone/socket/computeCloneSayVerdict.ts`       # the `enqueued` branch read off it

## .reason
see the ref-level cluster beside this choice:
- `term=cli.queue._.choice.reason.md` — etymology, the rejected peers, the write-queue overload
