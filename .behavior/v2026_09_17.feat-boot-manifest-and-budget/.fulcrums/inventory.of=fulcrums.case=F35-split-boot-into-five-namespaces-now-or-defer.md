# F35 — split `boot/` into five sub-namespaces now, or defer?

- **rework** = dirty
- **status** = **ANSWERED** — option **B** is taken (defer); the dream carries the shape and the sequence
  - 🟡 `ANSWERED` rather than a `DEFERRED` of its own: `F29` closed the identical *"do it now or
    defer?"* shape as `ANSWERED`, and a second word for one status is the synonym
    `rule.forbid.domain-term-synonyms` forbids. **the status grades WHO DECIDED, never WHICH ARM won**
- **confidence** = 80%
- **where** = `src/domain.operations/boot/` — 36 source files, 51 with tests
- **raised** = 2026-09-23, at `5.1.execution.from_vision` i016
  (`enroll-impl-arch-defects` root cause; `arch-opport-decomposition` nitpicks 1–3)

---

## .the fork

a lane read the whole subsystem and named the **root cause** that its peer lanes' nitpicks each
instance: the directory holds five unrelated sub-concerns — source resolution, spec parse, payload
assembly, budget gate, cost report — flat, with no boundary between any two.

🟡 **the absorbed items are enumerated in the dream, and their count is not restated here.** the
dream's table is what makes any number true, so a count beside it is a second claim that drifts the
first time an item moves (`rule.require.a-cue-is-not-a-claim`).

🔴 **and it produced the evidence rather than an assertion of it**: four recorded drifts on this
route each pair two sites that sit in **different** sub-concerns and the same flat directory — the
`dirBound`/`cwd` label, the `GLOBS_DEFAULT`/`getOneBootSource` disconnect, the tokenizer's
module-eval duplication, and the vanish contract's entry-vs-root asymmetry.

| option | what it costs |
|---|---|
| **A** — split into `boot/{source,spec,payload,budget,cost}/` now | ~36 source files move, every importer updates, and the diff touches essentially the whole feature — at the close of a round with 16 review iterations behind it |
| 🔴 **B** — defer, dream it, record the call | the flat shape that produced four cross-concern drifts stays, and a fifth is possible |
| **C** — take only the five local extractions the lanes named | 🔴 **worse than either.** the lane's own argument is that these are ONE defect; five local fixes buy tidiness and **hide the pattern** |

---

## .taken, and why

**taken: B — defer, with the dream that carries the shape, the two clamps, and the sequence.**

1. **SAFE 🟡 / CLEAN 🔴** (`rule.always.fix-forward-under-scouts-honor`). the un-safe half is narrow
   and real: the `spec/` concern is flowed through by **every extant role boot**, and one of the
   absorbed items (the three top-level-key scans) is a change to that parse path. the un-clean half
   is not narrow at all.
2. 🔴 **the wish's own bound.** `0.wish.md` scopes this behavior to the boot manifest and the budget
   and dispatches the two consumer halves elsewhere. a subsystem-wide directory restructure landed
   inside it is the *smuggled refactor* shape the CLEAN question exists to refuse.
3. **every lane graded every one of the five `[nitpick][better]`**, and named no shipped harm. per
   `define.invariant.review.peer.budget.urgent-earns-budget` a `better` concern earns the floor and
   never more than the floor.

🟡 **and the counter-pressure is stated rather than buried: a move-only diff is cheap to get RIGHT
and expensive to REVIEW.** so the argument against option A is review cost, not risk — which is a
weaker base than a deferral usually stands on, and is why this row sits at 80% rather than 90%.

---

## 🔴 .the residual 20% — one absorbed item has a nameable harm, and deferral leaves it open

four of the five items are maintainability. **`GLOBS_DEFAULT` is not:**

> add a new spec location to `getOneBootSource`'s shape resolution and forget the hand-maintained
> list in `getAllRepoBootSpecCosts.ts:31-41`, and **the `roles cost --all` sweep undercounts with no
> error.**

⇒ an undercount on a cost report is the one direction requirement 7 exists to eliminate, and this
deferral leaves it reachable. what keeps it a `better` today is that the two enumerations **agree**,
so no harm ships until someone edits one — which is a latency, never an immunity.

🟡 **and this row cannot clamp it.** the clamp the dream specifies (add a location to the resolver,
assert the sweep sees it) presumes one authority for both, which **is** the unification — which
needs the boundary. ⇒ the clamp and the fix are the same work.

### 🔴 .the second, INDEPENDENT argument — added `i017`, from `enroll-impl-arch-defects` r11 §1b

the four drifts above argue the split from a **recurrence rate**: cross-concern edits have diverged
four times, so a fifth is likely. that is a probabilistic case, and it is the one this row already
concedes is weaker than a deferral usually stands on.

🔴 **r11 names a structural case beside it, and it does not depend on the rate at all:** the repo
holds **two independent authorities** for *"where does a boot spec live?"*, and no mechanism keeps
them in step.

| the authority | where | shape |
|---|---|---|
| the **sweep's** enumeration | `getAllRepoBootSpecCosts.ts:31-41` | 4 hand-maintained glob patterns |
| the **resolver's** dispatch | `getOneBootSourceFromSpecPath.ts:38-54` | a coordinate test, in code |

🔴 **and the hazard is one-directional, which is what makes it more than a tidiness point:**

| a new spec location added to… | the other side | caught? |
|---|---|---|
| `GLOBS_DEFAULT` only | the dispatch already handles it — a path outside the role coordinate falls to the manifest arm | ✅ no defect |
| the **dispatch** only | 🔴 the sweep never visits it | ❌ **a silent undercount** |

⇒ the reviewer's own words are the disposition taken: *"a second, independent argument for it."*
**so a council that reads this row weighs two cases rather than one**, and the second does not rest
on whether the drift trail continues.

🟡 **this row is the second of its class on this stone** — a concern that is correct, repairable, and
whose clamp *is* the fix (`F36`, `F37` are the others). the yield calls the class **UNCLAMPABLE**,
and that word is the deliverable: a reader who expects a test beside every conceded concern needs a
name for the set where no test can exist short of the repair itself.

---

## 🔴 .what makes this row different from `F30`, and the difference is the lesson

`F30` deferred one unit on the same SAFE/CLEAN test and its trigger fired **five rounds later**, so
the deferral bought a cheap moment that never arrived.

| | `F30` | **this row** |
|---|---|---|
| the trigger it names | *"a fifth repair to this unit"* — a **recurrence** | 🔴 **a cross-concern drift, which has already happened four times** |
| so the bet is | that the trail ends before the fifth | **that no fifth drift lands before someone takes the split** |

⇒ 🔴 **this row makes the same bet `F30` lost, on a wider surface.** stated plainly rather than
smoothed over: if the trail continues, the honest expectation is that this row flips too.

---

## .what would flip it

**a FIFTH cross-concern drift** — a fix that lands in one sub-concern and not its peer. by the
record above the base rate is roughly one per four rounds, so a flip is likely rather than remote.

🟡 **or a scope grant.** this is the one deferral on the route whose blocker is the wish's own bound
rather than a technical judgment, so a wisher who widens the scope retires it without any new
evidence at all.

### 🔴 .the trigger, made COUNTABLE — added 2026-09-24

a later lane refused the deferral on procedure rather than on substance: it read two prior deferrals
made on schedule grounds, noted that the same shape at `F30` had already flipped under its own
stated trigger, and asked that this be raised actively rather than deferred a third time with no new
trigger condition.

⇒ **the objection to a third bare restatement is conceded, and it is the half worth repair.** a
trigger nobody can evaluate is not a trigger:

| | before | 🔴 now |
|---|---|---|
| the trigger | *a fifth cross-concern drift* | unchanged |
| the count today | implied by prose | 🔴 **four, enumerated by name** — `dirBound`/`cwd`, `GLOBS_DEFAULT`/resolver, the tokenizer's module-eval duplication, the vanish contract's entry-vs-root asymmetry |
| how a fifth is recognized | 🔴 unstated | a repair whose correct form touches **two** of the five sub-concerns and lands in one. the sub-concern roster is in the dream |
| where the count lives | 🔴 nowhere | the dream's table, which is the one artifact a fifth entry would be appended to |

🟡 **so the count is now a row tally on a table rather than a judgment**, which is what parts this
from the two restatements before it.

### ⚠️ .the schedule argument is answered, and it does not reach the blocker

the lane's case for action is that the review lanes have gone quiet, so this is close to as safe a
moment as it will get. that is true, and it addresses the wrong cost:

| the argument weighs | what actually blocks |
|---|---|
| **review** cost — quiet lanes make a move-only diff cheap to land | 🔴 **scope** — `0.wish.md` bounds this behavior to the manifest and the budget |

⇒ quiet lanes lower the price of the split and move the wish's bound not at all. a 36-file directory
restructure landed inside a behavior scoped to two features is the *smuggled refactor* shape the
CLEAN question exists to refuse, at any review price (`rule.always.fix-forward-under-scouts-honor`).

🟡 **and the `F30` comparison cuts both ways.** `F30` flipped **under its own stated trigger**, which
is the deferral mechanism held rather than broken. this row keeps that mechanism and sharpens what
its trigger reads.

---

## .the verdict, once ruled — (open; taken as **B** for this stone)

🟡 `open` here carries the set's one sense: **open to the council's reversal**, never *nobody
decided*. the call is made, its warrant is written, and the trigger that would flip it is named
above.

---

## .see also

- `.dream/2026_09_23.boot-is-thirtysix-flat-files-across-five-subconcerns.md` — the shape of the fix,
  the two clamps, and the move-only-first sequence
- `inventory.of=fulcrums.case=F30-decompose-getonebootsource-now-or-defer.md` — the same test on one
  unit, and the record of the bet it lost
- `inventory.of=fulcrums.case=F22-a-noun-cluster-is-not-a-bounded-context.md` — the open, disputed
  question this split would make **checkable** rather than argued
- `rule.always.fix-forward-under-scouts-honor` (driver) — the SAFE/CLEAN test that defers it
- `rule.always.catch-dreams-for-followups` (driver) — why a dirt deferral owes both artifacts
