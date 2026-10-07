# F39 — collapse `computeSubjectModePlan`'s four accumulation blocks now, or defer?

- **raised** = 2026-09-23, at `5.1.execution.from_vision`, `review.peer i018 r011` (confirmed; first
  seen at `i014 r010`)
- **rework** = 🔴 **dirty**
- **status** = ANSWERED — **defer**
- **confidence** = **88%**

---

## .the fork, stated fairly

`computeBootPlan.ts:244-402` accumulates one `BootPlan` through **four near-identical blocks**, each
of which repeats the same four moves at two grains — **eight copies of one accumulation step**.

| | **collapse to a shared accumulator** | **defer, with the dream that holds the plan** |
|---|---|---|
| line count | ~60 lines become ~15 | 8 copies stand |
| what a reader holds | one shape, one rule set | four blocks to diff by eye |
| 🔴 the **dedupe rules** | 🔴 **two of them, and a naive collapse keeps one** | both preserved, because neither moved |
| the clamp | 🔴 **absent** — see below | absent, and no repair rides on it |

---

## .the call, and why — at the time

**defer. the SAFE half of `rule.always.fix-forward-under-scouts-honor` fails, and it fails on a
mechanism rather than on a size estimate.**

the four blocks run under **two different dedupe rules**, and the difference is invisible at a
glance:

| block | the rule |
|---|---|
| `always` say | none — first writer wins by construction |
| `always` ref | **skip** where already said |
| 🔴 subject say | 🔴 **DEMOTE** — a say resource already said becomes a **ref**, never a no-op |
| subject ref | **skip** where already said **or** already ref'd |

⇒ **a shared helper that collapses all four to "skip a duplicate" silently drops the demote**, and
the loss is payload content rather than a crash. a resource that should have rendered as a `ref`
line would vanish from the render entirely — which is the silent mismeasure requirement 2 exists to
forbid, one layer below the gate.

🔴 **and the budget gate makes the stakes higher than they were when this was first deferred.** the
plan this function builds is the **denominator** every gate measures. a dropped ref line is a
payload that renders smaller than it should while the cap reads as met.

### why a clamp cannot be written cheaply first

the honest order is *clamp, then collapse* — and the clamp is the expensive half. it needs a fixture
whose subject section says a resource the `always` section already said, at both grains, with a
pinned render that shows the **demoted ref line** rather than an absence. that is a new fixture, two
new snapshots, and a `then` that asserts a line's presence for a reason no reader would guess.

⇒ **the dream carries that plan in full**, written from the context held at the read:
`.dream/2026_09_23.computesubjectmodeplan-accumulates-four-times-under-two-dedupe-rules.dream.md`.

---

## .why the confidence is 88% rather than higher

🔴 **the 12% is `F35`'s own bet, taken a second time.** `F30` deferred a decomposition on a
recurrence trigger, the trigger fired, and the deferral lost. this row defers a decomposition whose
trigger has now fired **three times** — `i014 r010`, and `i018 r011` twice over (as a confirmation
and as an assessment).

⇒ what parts this row from `F30` is that `F30`'s risk was **review cost** and this one's is
**silent payload loss**. a deferral that is wrong costs a round; a collapse that is wrong costs a
render nobody audits. ⇒ the asymmetry is what holds the call, and it is not a claim that the
duplication is fine.

🟡 **and this row sets no expiry either**, which is the same residual `F36` and `F37` carry. the
honest bound: the collapse is owed the next time this function is opened for any reason at all,
because the context needed to write the clamp is the context a reader holds only while they are
in it.

---

## .where

- `src/domain.operations/boot/computeBootPlan.ts:244-402` — the four blocks
- `src/domain.operations/boot/computeBootPlan.ts:333-360` — 🔴 the **demote** block, the one a naive
  collapse loses
- `.dream/2026_09_23.computesubjectmodeplan-accumulates-four-times-under-two-dedupe-rules.dream.md` —
  the shape of the fix, and the clamp plan
- `.fulcrums/inventory.of=fulcrums.case=F35-split-boot-into-five-namespaces-now-or-defer.md` — the
  peer deferral whose bet this one re-takes

## .the verdict, once ruled

_(open — for the fulcrum council)_
