# F30 — decompose `getOneBootSource`'s three arms now, or defer?

- **rework** = clean
- **status** = 🔴 **REVERSED** — the deferral's own stated trigger fired at i016; option **A** is taken
- **confidence** = 90% at the deferral · 100% at the reversal (the trigger is a fact, not a judgment)
- **where** = `src/domain.operations/boot/getOneBootSource.ts`
- **raised** = 2026-09-21, at `5.1.execution.from_vision` i011 (`enroll-impl-behavior-intent` nitpick.1)
- **reversed** = 2026-09-23, at i016 (`arch-decomposability` blocker.1 + `enroll-impl-behavior-intent` blocker.1)

---

## .the fork

a peer lane read all eleven rounds and named this unit as **the most defect-recurrent in the whole
trail** — `F4`'s original bug, then an i009 label/escape-root drift three lines from the prior fix.
its three arms each fuse i/o, validation, and construction, so no arm carries a unit test of its own.

| option | what it costs |
|---|---|
| **A** — decompose now, one operation per arm | restructures the unit **every gate** reaches through, at the close of the round, with an integration suite and three acceptance suites downstream |
| 🔴 **B** — defer, dream it, record the call (taken) | the shape that invited four repairs stays, and a fifth is possible |
| **C** — extract the ONE arm the lane cited | 🔴 **already done, and it is the precedent rather than an option** — `getOneBootSourceForSpecPath.ts` is that arm, extracted |

---

## .taken, and why

**taken: B — defer, with the dream that carries the shape of the fix.**

1. 🔴 **the WHEN is the argument, not the whether.** this unit's entire recorded history is *repairs
   landed under round-close pressure that drifted*. to restructure it in the round that seeks to
   close reproduces the exact condition the finding is about.
2. **SAFE ✅ / CLEAN 🔴** (`rule.always.fix-forward-under-scouts-honor`). the arms separate cleanly
   — that is the SAFE half — and the blast radius is *every gate this feature ships*, which is the
   ripple CLEAN refuses.
3. **the lane graded it `[nitpick][better]` itself**, and named no shipped harm. per
   `define.invariant.review.peer.budget.urgent-earns-budget` a `better` concern earns the floor and
   never more than the floor.

🟡 **and the precedent cuts FOR option A, honestly stated:** `getOneBootSourceForSpecPath.ts` proves
the target shape works here, so A is not speculative. what defers it is timing and blast radius,
never doubt about the design.

---

## 🔴 .the residual 10% — the lane's sharpest claim is one this round cannot refute

> *"it's fixed every time it's caught, but its shape keeps inviting a repeat."*

⇒ **a deferral answers the first clause and leaves the second untouched.** the four repairs on
record were each caught by a **human re-read**, never by a red test — so the mechanism that has
protected this unit so far is exactly the one that retires when the trail ends.

🟡 **and this fulcrum cannot clamp that.** a clamp would be the per-arm unit tests, which is option
A. so the honest statement is: **the defect class stays open, and the dream is the only thing that
carries it forward.**

---

## .what would flip it

a **fifth** repair to this unit. at that point the re-read mechanism has demonstrably failed to
converge, and the per-arm tests stop being a nicety.

---

## 🔴 .the flip — it fired, and it fired on the trigger this row named

**2026-09-23, i016.** two independent lanes escalated this unit from nitpick to **blocker** in one
round, and one of them cited this row's own trigger by name. the deferral is retired; **option A is
taken.**

| what the row predicted | what i016 delivered |
|---|---|
| *"a fifth repair to this unit"* | 🔴 the fifth, and two lanes raised it rather than one |
| *"the re-read mechanism has demonstrably failed to converge"* | eleven rounds of re-read, and the unit's shape survived every one of them |
| *"the per-arm tests stop being a nicety"* | ⇒ they are now the deliverable |

### what was built

| file | grain | its own clamp |
|---|---|---|
| `BootSource.ts` | the contract, upstream of every arm | — (a type) |
| `getOneBootSourceFromRegistryRole.ts` | a pure **transformer** — no i/o | `…FromRegistryRole.test.ts` — **unit** |
| `getOneBootSourceFromRole.ts` | `existsSync` + `--if-present` + the refusal | `…FromRole.integration.test.ts` |
| `getOneBootSourceFromManifest.ts` | the escape check + `isFile()` + the did-you-mean | `…FromManifest.integration.test.ts` |
| `getOneBootSource.ts` | a **dispatcher**, three `if`s, no logic | `getOneBootSource.integration.test.ts` — the dispatch alone |

🔴 **the dispatcher keeps a clamp of its own, and the reason is not symmetry.** each arm test calls
its arm DIRECTLY, so a mis-wired dispatcher leaves all three green while `roles boot --repo x` renders
a registry label. the arms prove their guarantees; only the dispatch test proves the caller reaches
them.

🟡 **the preposition changed on the way through, and it was a read of the contract rather than a
taste call.** the arms were first named `…For$Arm`, inherited from the extant
`getOneBootSourceForSpecPath`. the dispatcher's own discriminant key is `from:`, so `…From$Arm` maps
one-to-one onto the `PickOne` a reader already holds — one word, one sense
(`rule.forbid.ambiguous-labels`). the extant sibling was renamed to match, so the family carries no
second preposition for a reader to decode.

### 🔴 what the flip's TIMING says about the deferral's argument

the deferral's first reason was *"the WHEN is the argument"* — that a restructure at round-close
reproduces the pressure the concern is about. **that reason was correct and it does not survive its
own success condition.** the round did not close; it ran five more iterations, so the deferral bought
the exact cheap moment it awaited and then had to be spent anyway.

⇒ 🟡 **the lesson is narrower than "defer less".** a deferral whose stated trigger is *"one more
recurrence"* is a bet that the trail ends first. this trail did not, and a bet on a round's end is a
bet on a quantity the driver does not control.

---

## .the clamp

🔴 **the class is now clamped, which is what the residual below said no deferral could do.** the
per-arm tests ARE the clamp — each arm's invariant is enforced by its own red-able test rather than
by a human re-read of a three-arm body. the two snapshots carried over byte-identical, so the split
changed no behavior it was not meant to.

⚠️ the residual section above is kept **unedited**, as the record of what was true while the
deferral stood.

---

## .see also

- 🟡 its dream — `2026_09_21.getonebootsource-is-the-most-defect-recurrent-unit-…` — was **pruned
  once the split landed**, so `.the flip` above is the record that outlived it. the two corrections
  it carried are restated there
- `inventory.of=fulcrums.case=F4-budget-gate-position.md` — the round that found the original bug
- `rule.always.fix-forward-under-scouts-honor` (driver) — the SAFE/CLEAN test that deferred it
- `rule.always.catch-dreams-for-followups` (driver) — why a dirt deferral owes both artifacts
