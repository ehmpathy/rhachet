# F40 — derive the sweep's reach from the dispatcher, or DISCLOSE it?

- **rework** = clean
- **status** = **ANSWERED** — disclose. the lane's concern was real and its proposed mechanism
  cannot exist
- **confidence** = 90%
- **where** = `src/domain.operations/boot/getAllRepoBootSpecCosts.ts` (`GLOBS_DEFAULT`) ·
  `src/domain.operations/boot/asBootCostSweepReachLines.ts` (new) ·
  `src/contract/cli/invokeRolesCost.ts`
- **raised** = 2026-09-23, at `5.1.execution.from_vision` i017 (`GLOBS_DEFAULT` blocker)

---

## .the fork

a lane read `GLOBS_DEFAULT` — the four globs `roles cost --all` walks — and named a drift hazard:

> the sweep hard-codes a path policy that the boot's own source resolver knows independently. add
> a spec kind and the two disagree, with no compiler help and no test that reddens.

⇒ the concern names a real shape. two lists of paths, each maintained by hand, each able to drift
from the other, is the defect a shared constant exists to prevent.

| option | what it costs |
|---|---|
| **A** — extract a shared path constant both the sweep and the resolver read | 🔴 **it cannot exist** — see the refutation below |
| **B** — leave `GLOBS_DEFAULT` as-is, note the coupling in a docblock | the completeness overclaim stays live, and a docblock note reddens no test |
| 🔴 **C** — keep the globs, and make the sweep **disclose its own bound** in the render | the reach is now a render surface, so a glob added with no line added is visible |

---

## .taken, and why

**taken: C — disclose the bound. the proposed derivation is refuted on fact.**

### 🔴 .why A cannot exist — the resolver has no path set to share

the lane's premise is that `getOneBootSourceFromSpecPath` *"knows"* the set of spec paths. it does
not. it is **total and binary**: hand it any path, and it either reads a spec there or refuses.

| | the sweep | the resolver |
|---|---|---|
| answers | *"which paths hold a spec?"* | *"is there a spec at THIS path?"* |
| its domain | a **policy** — four globs someone chose | 🔴 **every path inside the repo** |

⇒ **a `--manifest` may sit anywhere**, which is the whole point of the flag. so the resolver's path
set is unbounded, and an unbounded set cannot be the source of a bounded one. there is no third arm
for the two to forget in different ways — the shape the lane reached for has one member.

🟡 **so the drift the lane predicted has a different shape than the lane gave it.** a new *spec kind*
would not desync two lists; it would be a path the sweep does not walk and the resolver reads fine.
that is not disagreement — it is **silent incompleteness**, and it is the real hazard.

### 🔴 .why the incompleteness was worth a repair anyway

`--all` is a completeness claim in the flag's own name, and the sweep cannot honor it. the empty
render is where that lands hardest:

```
🧢 roles cost --all
   └─ no boot specs found in this repo      ← the claim, before
```

a reader whose manifest sits at a custom path is told their **repo** has none. ⇒ that is
`rule.forbid.failhide` at the render grain: a true statement about four globs, rendered as a false
one about a repo.

**the repair returns the globs from the sweep and renders them**, plus the way past the bound:

```
   ├─ no boot specs found at the paths swept
   │
   └─ swept
      ├─ .agent/repo=*/role=*/boot.yml
      …
   .note = a spec outside these paths is not swept. name it directly to cost it —
           `roles cost --what <path>`.
```

🔴 **the last line is what parts a disclosure from a dead end.** a stated bound with no exit tells a
reader their case is unserved; the `--what` pointer tells them the command that serves it
(`rule.require.errors-name-the-fix`).

### .and it reddens a test, which B does not

the reach is now a **render**, so it carries clamps: `asBootCostSweepReachLines.test.ts` pins that
every glob is named individually (never a count), that the bound is stated as a bound, and that the
way forward is named. the acceptance suite pins it on **both** arms — populated and empty — because
the reach is a property of the sweep rather than of one outcome.

⇒ so a glob added to `GLOBS_DEFAULT` with no thought for the reader now moves a snapshot a reviewer
reads, where under B it would have moved nothing at all.

---

## 🟡 .the residual 10% — the render is not a derivation, and a reader may want one

disclosure makes the bound **visible**; it does not make it **correct**. a glob added to the array
flows into the render automatically, so the two cannot disagree — but a spec kind that *should* be
swept and is not remains invisible, exactly as before. the render says what the sweep walks, never
what it ought to.

⇒ a council that wants the stronger property would need a **registry of spec kinds** that both the
sweep and the introspect guard read. that is a real design, and it is larger than this row: it
implies spec discovery becomes a declared thing rather than a glob policy, which touches gate 1 too.

---

## .what would flip it

- **a spec kind that ships and is not swept.** that converts the incompleteness from a disclosed
  bound to a live gap, and the registry above becomes owed
- **a second consumer of the glob policy** — today the sweep is the only reader. a second one is the
  moment a shared constant is genuinely earned, and the refutation above stops to apply
- **a reader who follows the `--what` pointer and finds it does not serve them.** the disclosure
  rests on that exit being real; if it is not, the bound becomes a dead end and B's honesty
  advantage returns

---

## 🟡 .the reach gained a NAMED OWNER — 2026-09-24

the row's answer is unchanged, and one thing under it moved: the glob set, its ignore list, and the
four `fast-glob` options that make the sweep complete now live in `getAllRepoBootSpecPaths`, which
returns them beside the paths they found.

⇒ it was extracted for a different reason — an inline `glob()` with five options is decode-friction
in what is otherwise an orchestrator (`rule.forbid.inline-decode-friction`) — and it **strengthens
the disclosure half of C** as a side effect:

| | before | now |
|---|---|---|
| where the reach lives | a module constant beside the sweep's body | 🔴 **one operation whose whole subject is the reach** |
| what a reader greps for | a constant name, and whatever else touches it | one file, whose docblock states the refutation |
| how the render learns the bound | the sweep returns the constant it happened to use | the reach is **returned by the operation that applied it**, so the two cannot disagree |

🔴 **it does NOT weaken the refutation, and the distinction matters.** a named owner is one statement
of *"which paths do I look at?"*; it is still not a set the resolver could share, because the
resolver enumerates no paths at all. ⇒ *"the reach now has a name"* and *"the reach can be derived"*
are different claims, and only the first is true.

🟡 **and it moves the second flip condition closer without satisfaction of it.** a shared constant is
earned by a **second consumer**; an extraction gives the one extant consumer a better shape and adds
no second reader.

---

## .see also

- `src/domain.operations/boot/getAllRepoBootSpecPaths.ts` — the reach policy's one owner
- `src/domain.operations/boot/asBootCostSweepReachLines.ts` — the render, and the refutation in its
  own docblock
- `src/domain.operations/boot/asBootCostSweepReachLines.test.ts` — the four clamps
- `blackbox/cli/roles.cost.acceptance.test.ts` `[case8]` + `[case11]` — the pair that pins the
  disclosure on both arms
- `rule.forbid.failhide` (mechanic) — what the unstated bound was
- `rule.require.errors-name-the-fix` (ergonomist) — why the `--what` pointer is owed
- `inventory.of=fulcrums.case=F17-roles-cost-reports-a-different-unit.md` — the peer row on this
  same command's honesty about what it measures

---

## .the verdict, once ruled — (open; taken as **C** for this stone)

🟡 `open` carries the set's one sense: **open to the council's reversal**, never *nobody decided*.
