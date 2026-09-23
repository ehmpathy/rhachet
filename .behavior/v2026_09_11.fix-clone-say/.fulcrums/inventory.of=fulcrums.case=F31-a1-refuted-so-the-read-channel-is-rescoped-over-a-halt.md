# F31 — A1 REFUTED, so the read channel is rescoped rather than halted on

**rework** clean · **status** OPEN · **confidence** 91%

## .the fork, stated fairly

the vision names one premise as the one the diagnosis rests on:

> **A1 — a brain-cli queues a submitted message when a turn is in flight, and does not write it to the
> transcript jsonl until it dispatches as a turn.** the whole diagnosis rests on this, and it is
> testimony, not a measurement.

it was measured 2026-09-18 against a live claude-code v2.1.87, and it has two clauses that part:

| clause | verdict |
|---|---|
| (a) the brain **queues** a submitted message while a turn is in flight | ✅ **confirmed** |
| (b) it **withholds** the transcript write until the message dispatches as a turn | 🔴 **REFUTED** — the rise landed within 678ms, while the message was visibly held |

⇒ the brain records a user turn **at submit**. so a transcript rise proves `submit`, never `release`.

### what that does to the wish's stated ask

R1 reads *"a say that landed is no longer reported as a failure."* the mechanism the vision assigns to
that symptom is a **lagged transcript** — and there is no lag. so:

| the defect the wish names | the defect the measurement found |
|---|---|
| a false **FAILURE** — `MalfunctionError` on a landed say | a false **SUCCESS** — `released` on a message the brain merely holds |

both are real classes; only the second is measured. 🔴 **and the second was live in prod**: a dispatch
into a mid-turn peer returned `😶🎙️ said to @:x`, and `--await release` returned at a submit — the one
guarantee that flag exists to make.

## .the options

| option | cost |
|---|---|
| **A** — keep the read channel; rescope its stated benefit to the false `released` it provably closes; record the refutation; itemize R1's now-unmeasured premise for the wisher | R1's headline symptom ships without a measured root. the wisher may read that as the ask unmet |
| **B** — halt (`--as blocked`) for a wisher re-read of R1 before any further work | the halt buys no measurement a driver can take: R1's root is the **wedge** class, whose isolation is a separate open thread. so the road stops and the question does not advance |
| **C** — hunt R1's real root now, in this stone | unbounded. the wedge class has resisted isolation across this whole gate, and R1's symptom is intermittent by report — an instrument for it is not in hand |

## .taken, and why

**A**, on three grounds, and none of them is that A is convenient:

1. **the deliverable is unchanged by the refutation.** R2 (read the screen) · R3 (part the three
   states) · R4 (pre-check the box) are each independently asked for, and each is met. the refutation
   changes *which* defect the channel closes, never *whether* the channel is owed
2. **its value went UP, not down.** a false failure is loud — a human sees a `MalfunctionError` and
   retries. a false `released` is **silent**: a daemon suppresses its retry on a message no brain ever
   took, and no log line reports it. ⇒ the channel now closes the worse of the two classes
3. **the halt is unproductive** (`rule.always.raise-a-blocker-a-taken-cannot-close`): the test asks
   *"is there a change I am PERMITTED to make that would close this?"* — for the **rescope**, yes, and
   it is done. for **R1's root**, the close needs the wedge isolation, which is its own thread and
   already named as open. so a halt here reports a wall that is not this stone's

⇒ **and the refutation is recorded rather than smoothed over.** the suite that measured it is inverted
to clamp the truth; the vision's A1 row in the verification yield is marked REFUTED; the durable brief
`define.brain-cli-input-states.md` now carries how each state is read and why the transcript alone
cannot part two of them.

## .why the confidence is 91% and not higher

the 9% is one verdict a wisher could reasonably reach: that R1 IS the wish, and a PR that closes a
different defect — however worse — has not done what was asked. that is a scope judgment, and it is
theirs.

⇒ what the 9% does **not** cover: whether the measurement is right. it is a direct read of a live
brain, cross-checked against the repo's own prose (`getCloneSubmittedCount.ts:12-15`, which had said
the same all along and had never been reconciled with the vision).

## .where

- `blackbox/cli/clone.transcript-lag.realbrain.acceptance.test.ts` — inverted; clamps the refutation
- `src/domain.operations/clone/screen/computeCloneInputState.ts` — the dim queue-hint read
- `src/domain.operations/clone/socket/computeCloneSayVerdict.ts` — `released` gated on an empty queue
- `.agent/repo=.this/role=any/briefs/define.brain-cli-input-states.md` — the durable half
- `5.3.verification.yield.md` — cure 17 (the measurement, the cure, the clamps, the live proof)

## .the verdict, once ruled

_open — the wisher's to rule._
