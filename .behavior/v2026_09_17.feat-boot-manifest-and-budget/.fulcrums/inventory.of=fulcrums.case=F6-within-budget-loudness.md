# F6 — how loud a within-budget boot is about its budget

**rework: clean · status: ANSWERED · confidence: 80%**

> 🔴 **the say→ref nitpick in this file is SUPERSEDED by `F12`, and the truth is worse than the
> nitpick claimed.** the nitpick said a say→ref move leaves the `files` count unmoved, so the edit
> **looks ineffective**. F12 measures the reverse: the move drops the **gated** number far more than
> it drops actual occupancy, because the added `<brief.ref>` line is emitted and **uncounted**
> (16,427 gated of 44,982 emitted).
>
> ⇒ the edit looks **more** effective than it is — the dangerous direction. the `<stats>` legibility
> fork below stands on its own; only the diagnosis of the say→ref case is replaced.

---

## .the fork, stated fairly

| option | the cost |
|---|---|
| **say naught unless over** | the author cannot watch the headroom shrink. the cap arrives as a surprise on the day it refuses |
| **always name `used / budget`** | one extra line inside `<stats>`, on every boot, forever |
| name a percentage only past a threshold (e.g. 80%) | a third state to explain, and a second constant to tune |

---

## .the guess taken, and why

**always name `used / budget`, inside `<stats>`.**

```
  └── tokens ≈ 4210 / 5000 budget   (84% used)
```

| the argument | |
|---|---|
| it is the only option where the cap is **steerable** | a cap that speaks only when it refuses teaches the author naught until it halts them |
| it costs one line | and that line **replaces** part of the extant `tokens ≈ N ($X at $3/mil)` rather than an extra row |
| the threshold option adds a tunable | a third state ("quiet / warn / halt") needs a constant nobody has a basis to pick |

🔴 **the line must sit INSIDE `<stats>`, never above it.** the boot's stdout is the context
payload, and `<stats>` is already a snapshotted block
(`roles.boot.bootyaml.acceptance.test.ts.snap`). a line outside the block would land in the
prose a brain reads as instruction.

---

## .the confidence — 80%

| confident | not confident |
|---|---|
| the always-name option is right | whether the `$X at $3/mil` cost figure should stay beside it |
| the line belongs inside `<stats>` | whether `(84% used)` earns its parentheses or is noise |

🟡 the 20% is about what the line **replaces**. the extant line carries a dollar figure; the wish
itself flags that figure as a misread waiting to happen once prompt caches hit (*"it caps CASH
only while the prompt cache misses"*). so there is a live question whether to:

- keep the dollar figure beside the budget (two numbers, one of them knowingly overstated)
- drop the dollar figure when a budget is declared (the budget is the honest number)
- keep both, and name the unit honestly in the docs, as the wish asks

⇒ **best-guess: keep both, and name the unit in the docs.** the wish explicitly asks for the
honest name rather than a unit change, so a silent drop would over-read the instruction.

---

## 🔴 .the nitpick the dense walk added — the say→ref move is invisible in the top line

found at `1.vision.experience.case=7.the-authorship-loop.md`, `[t3]`. **not a blocker; a legibility
defect in the block this fulcrum owns.**

the halt's first remedy is *"move a say entry to ref"*. an author who takes it re-boots and reads:

```
quant
  ├── files = 9          ← unchanged
  │   ├── briefs = 9
  │   │   ├── say = 3    ← was 9
  │   │   └── ref = 6    ← was 0
  ├── chars = 19720
  └── tokens ≈ 4930 / 5000 budget   (99% used)
```

⇒ **`files` did not move**, and it follows from the extant code rather than a guess:
`relevantFiles` (`bootRoleResources.ts:105-113`) counts **say and ref together**, while
`totalChars` (`:127-146`) counts **say only**.

🔴 **so the remedy the halt recommends is the one remedy whose effect is invisible in the top line
of the very block that reports it.** the author's first read is *"the edit did not take"*.

| the fix considered | the cost |
|---|---|
| **name the delta on the line the author already reads** — e.g. `tokens ≈ 4930 / 5000 budget (99% used, −2310)` | one template change; needs the prior boot's count, which no boot holds today ⇒ 🔴 **not viable alone** |
| **hoist the say/ref split up one level** when a budget is declared — `files = 9 (say 3 · ref 6)` | one template change, no state. the number that moved sits beside the number that did not |
| relabel `files` → `files.resident` | touches every extant boot snapshot, and `files` was never resident-only |

⇒ **best-guess: hoist the split.** it is the only option with no new state and no rename, and it
puts the moved number in the author's first line of sight.

🟡 this is **scoped to the budget-declared case**, deliberately. a boot with no budget has no
remedy to make legible, and requirement 4 forbids a shape change there.

---

## .the rework cost — why clean

one `console.log` template plus a resnap of every boot snapshot. no contract, no persisted value.

---

## .where

- `src/domain.operations/invoke/bootRoleResources.ts:164-186` — `printStats`
- `src/domain.operations/invoke/bootRoleResources.ts:149-154` — the `$3/mil` cost figure
- `src/domain.operations/invoke/bootRoleResources.ts:105-113` — `relevantFiles`, say **+** ref
- `src/domain.operations/invoke/bootRoleResources.ts:127-146` — `totalChars`, say **only**
- `blackbox/cli/__snapshots__/roles.boot.bootyaml.acceptance.test.ts.snap` — the pinned shape

## .the verdict

_(open — for the fulcrum council)_
