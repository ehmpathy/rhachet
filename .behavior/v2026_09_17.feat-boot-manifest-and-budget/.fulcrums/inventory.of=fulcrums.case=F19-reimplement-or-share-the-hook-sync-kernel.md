# F19 — reimplement the hook-sync kernel, or share the extant one?

- **rework** = clean
- **status** = 🔴 **MOOT — the second copy is DELETED, so there is no duplication left to fork on**
- **confidence** = 72% (the taken was right, and then it stopped to matter)
- **where** = ~~`src/domain.operations/brains/syncRhachetHooksIntoOneBrainRepl.ts`~~ — **deleted**
- **raised** = 2026-09-18, at `5.1.execution` `review.self r3` (`has-consistent-mechanisms`)

🔴 **read `.the dissolution` at the foot first.** `S14` cut the `onStop` hook, and the whole reason a
second sync kernel existed went with it.

---

## .the fork

gate 2 needs a hook declared under a **framework** author rather than a role one, so
`syncRhachetHooksIntoOneBrainRepl` was written beside the extant
`syncOneRoleHooksIntoOneBrainRepl`. the two share a kernel:

```
get every hook under this author  ⇒  upsert every declared one  ⇒  delete every found-but-undeclared one
```

and differ in ONE input: where `declared` comes from.

| | extant | mine |
|---|---|---|
| author | `repo=$slug/role=$name`, computed from a `Role` | 🔴 `rhachet`, a constant that must NOT match that shape |
| declared | `extractDeclaredHooks({ role, author })` | a module constant |
| the kernel | 🔴 **fused into the same function** | 🔴 **re-derived** |

| option | what it costs |
|---|---|
| **A** — extract `syncDeclaredHooksForOneAuthor({ author, declared, adapter })`, both call it | ripples into an extant, tested, load-bearing sync whose blast radius is a human's real brain config |
| 🔴 **B** — reimplement the kernel (taken) | two copies of one algorithm, and the second author must re-derive every hazard the first already solved |
| **C** — synthesize a fake `Role` for rhachet | 🔴 **wrong, not merely ugly** — the prune filters on `/^repo=.+\/role=.+$/`, so a role-shaped author would make the framework hook an orphan on the next unlink |

---

## .taken, and why

**taken: B — reimplement, and record the fork here.**

1. **`rule.prefer.wet-over-dry` counts TWO usages, not three.** its own ladder reads *1 = write
   inline · 2 = copy-paste ok, note the duplication · 3+ = consider abstraction*. so the repo's
   own rule says note it and wait.
2. 🔴 **A is SAFE but NOT CLEAN.** `syncOneRoleHooksIntoOneBrainRepl.ts` and its suite are not in
   this change's diff, and what they write is a human's `.claude/settings.json`. that is the
   ripple the CLEAN question exists to refuse (`rule.always.fix-forward-under-scouts-honor`).
3. **the diff is already the constraint.** 9 of 11 peer lanes overflowed at ~293 files, so a
   refactor of an unrelated extant file makes the next round harder to review for no product gain.

---

## 🔴 .the residual 28% — I hit a pothole the pavement had already routed around

this is the strongest case against the taken, and it is not hypothetical.

my file carries a 🔴 comment that records a **measured** defect: staleness keyed on a full
`serialize()` found EVERY hook stale, because the dao returns `timeout` as a duration **shape**
(`{ milliseconds: 10000 }`) where we declare it as **words** (`'PT10S'`). the sync then deleted
its own gate on the second run.

⇒ **the extant `computeHookDiff` is immune to that by construction.** it routes a serialize
mismatch to `toUpdate` (an upsert) and computes `toRemove` on the **unique key** — so the shape
divergence costs it a redundant write and never a deletion.

**so the extant code had already solved the exact hazard, and I re-derived it, wrongly, then
fixed it to a different-but-also-correct shape.** that is `rule.always.reuse-pavement-before-improvise`'s
named failure: *"only a reader can improve the pavement — so a skipped read FREEZES it."*

🟡 **and the skipped read would have paid twice.** a read of the extant diff surfaced a latent
inefficiency in it: because the `timeout` shapes never match, `unchanged` is **always empty** and
every hook is re-upserted on every init. it is benign (idempotent, and `unchanged` reaches no
human — grepped), so it is noted here rather than dreamed — but it was invisible until this read.

---

## .what would flip it

a **third** author of hooks. at three usages `wet-over-dry` stops to counsel patience, and the
extraction becomes owed rather than optional.

---

## .the clamp

`syncRhachetHooksIntoOneBrainRepl.integration.test.ts` `[case2]` — a second sync leaves the config
byte-identical, which is the assertion the deleted-its-own-gate defect fails.

---

## 🔴 .the dissolution — the fork's SUBJECT was deleted

**2026-09-23, `S14`.** the wisher cut the `onStop` hook. the second sync kernel existed **only** to
declare that hook under a framework author, so it was deleted with it:

| the file | fate |
|---|---|
| `syncRhachetHooksIntoOneBrainRepl.ts` | 🔴 **deleted** |
| `syncRhachetHooksIntoEachBrainRepl.ts` | 🔴 **deleted** |
| `asBudgetSweepCaller.ts` + the `--when hook.$event` flag | 🔴 **deleted** |

> **the count of hook authors went back to ONE, so `wet-over-dry`'s ladder does not even reach its
> second rung.**

⇒ the taken (`B` — reimplement, and wait for a third usage) was **correct and is now void**: there
is no second usage to abstract from, and no third to wait for.

### 🟡 what this row is still worth, after its subject is gone

the residual 28% is the part that outlives the fork, because it is a lesson about **conduct** rather
than about this code:

> the extant `computeHookDiff` had already solved the exact staleness hazard I re-derived wrongly.
> **a skipped read of the pavement cost a measured defect and froze an inefficiency the read would
> have surfaced.**

⇒ that stands whether or not the file it happened in survives, and it is the second instance in this
route of `rule.always.reuse-pavement-before-improvise`'s named failure.

🔴 **and the dissolution sharpens it once more.** the re-derivation cost real rounds — the defect,
the fix, this fulcrum, its clamp — **on code that was deleted five days later.** the cheapest read
was of the pavement; the cheapest question was *"is this gate owed at all?"* neither was asked.

---

## .see also

- `.seeds/inventory.of=seeds.case=S14-the-sweep-has-no-hook.md` — the cut that dissolved this
- `rule.prefer.wet-over-dry` (mechanic) — the ladder that sets the threshold at three
- `rule.always.reuse-pavement-before-improvise` (learner) — the rule the residual records, and the
  one part of this row that survives its subject
- `rule.always.fix-forward-under-scouts-honor` (driver) — the SAFE/CLEAN test that deferred it
- `review/self/for.5.1.execution.from_vision._.r3.has-consistent-mechanisms.md` — the round that raised it
