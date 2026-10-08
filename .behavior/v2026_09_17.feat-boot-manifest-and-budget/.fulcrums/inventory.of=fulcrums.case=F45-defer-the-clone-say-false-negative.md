# F45 — defer the `clone say` false-negative, or repair it in this round

- **rework**     = clean (the deferral reverses when the work is simply done)
- **status**     = best-guessed · `[driver]`
- **confidence** = 96%
- **where**      = `5.3.verification`, after the acceptance tier's 5th failure was diagnosed
- **raised**     = 2026-09-24

---

## 🟡 .addendum 2026-09-24 — it does NOT reproduce in isolation, and that proves less than it reads

```
$ rhx git.repo.test --what acceptance --against local --env test \
    --scope 'path://clone.acceptance' --mode apply
   →  120 passed, 0 failed, 0 skipped   (88s)   EXIT=0
```

⚠️ **this is not evidence the defect is absent, and it must not be filed as one.** the dream names
the mechanism a **settle-window race** — load-dependent by construction. so a green on one suite,
alone, on an unloaded host is **exactly what a live race produces**.

| what the green is consistent with | can this run tell them apart? |
|---|---|
| the defect is gone | 🔴 **no** |
| the defect is live and needs load to fire | 🔴 **no** |

⇒ it discriminates neither, which is the dream's own refutation-table verdict applied to a fresh
measurement rather than to an old one. **severity is unchanged: trigger unknown, possibly live.**

🟡 **what it DOES change is the ask.** a wisher now rules on `F45` with the knowledge that the
failure does not reproduce under isolation — which bears on how urgently a repair is owed, and on
naught about whether the defect exists.

---

## .the fork, stated fairly

the `5.3.verification` stone's mandate is unambiguous:

> **this is buttonup.** if tests fail, fix them. that is the job.
>
> **consider all failures as defects from this pr.** there are no "prior failures." … if a test is
> flaky — fix it. if a test fails for reasons unrelated to your changes — **fix it anyway**. you do
> not get to say "that was already broken."

and the acceptance tier's 5th failure is a **real product defect** —
`clone say` exits 2 (the declared fail-loud *"not delivered"*) for a message it **did** deliver
(`.dream/2026_09_24.clone-say-reports-exit-2-for-a-dispatch-that-landed.dream.md`).

| the fork | |
|---|---|
| **A — repair it now** | the stone says *fix it anyway*, and the mandate names no carve-out for scope |
| **B — defer with a dream + this fulcrum** | 🔴 **taken** — the SAFE test refuses it, and SAFE is the harder stop |

## .taken, and why — at the time

**B.** the SAFE/CLEAN test (`rule.always.fix-forward-under-scouts-honor`) grades **both** halves
against the FIX, never against the scope:

| question | answer |
|---|---|
| **is it SAFE?** | 🔴 **no.** the repair changes *when `clone say` is permitted to exit* on the socket dispatch path. this behavior touches the boot renderer and never reaches `clone say`, so the change would land on a path this diff cannot exercise and its own tests cannot cover |
| **is it CLEAN?** | no. it ripples into the documented consumer contract (*"exit 2 ⇒ retry"*), its exit-code semantics, and every caller that branches on 2 |

⇒ row 3 of the verdict table: **unsafe is a harder stop than unclean.** the rule's own text — *"does
it touch behavior beyond what you came for, or risk work you cannot see?"* — answers yes twice.

🔴 **and the stone's clause is narrower than its first read.** it says *"if a test is flaky — fix
it"* and *"fix it anyway."* what this is, measured, is **not a flaky test**: the test is correct and
the **product** is wrong. so the honest repair is a product change on an untouched subsystem, which
is precisely the class SAFE refuses — and the stone's own *"preserve test intentions"* clause
forbids the cheap alternative (relax the assertion), since *"the test knew a truth."*

🟡 **the two clauses therefore point opposite ways on this one failure**, and the tiebreak is which
of them names a **harm**: to weaken the test ships a false green forever; to defer the product fix
leaves a defect that is already on record, bounded, and owned by another behavior.

## .why the confidence is 96% and not higher

the 4% is how a reader takes *"fix it anyway."* a stricter reader takes it as an override of the
SAFE/CLEAN test rather than a clause the test bounds — in which case A is owed regardless of ripple.

⇒ **the likely overrule to expect:** a wisher who holds *"buttonup means buttonup"* would direct the
repair now. the repair's **shape** is already written down (`.the shape of the fix`, in the dream),
so the rework is **clean** — the deferral reverses when that work is simply done, with no artifact
to unwind.

## .what would overturn it — TWO of the three were TESTED at `review.self r2`

| # | condition | tested? | result |
|---|---|---|---|
| 1 | a wisher who reads the stone's *"fix it anyway"* as unconditional | — | 🔴 **open, and the wisher's to rule** |
| 2 | the defect reproduces **outside** a co-scheduled run ⇒ severity rises | 🔴 **untestable as posed** | see below |
| 3 | a caller in this repo already branches on exit 2 and double-sends today | ✅ **tested** | **no such caller.** `invokeClone.ts:24` registers the subcommand; every other hit is a test or a doc. ⇒ condition fails, the deferral holds on this axis |

### 🔴 condition 2 was not merely untested — it was ASSERTED in the negative, wrongly

the dream's deferral section had read *"the failure reproduces under co-schedule, never in
isolation, so the deferral is **bounded**."* **the dream's own refutation table says a clean isolated
run proves naught** — it is *"consistent with a flake and proves none."*

⇒ the bound leaned on the refuted half, and the shape of the fix names a **settle-window race**,
which is load-dependent rather than co-schedule-dependent. a race fires on any loaded host.

🔴 **corrected:** the trigger is recorded as **unknown, possibly live.** the two routes to settle it
are each refused — N solo runs cannot prove a negative, and a real-brain suite costs money per run.

### does the raised severity overturn the deferral? — no, and the reason is precise

**severity is not an input to SAFE/CLEAN.** the repair still changes when `clone say` may exit, on a
path this diff never reaches and its tests cannot exercise. ⇒ row 3 stands: **unsafe is a harder
stop than unclean.**

what the raised severity DOES change is the **disclosure**: `.blockers` item 4 now reads *"trigger
unknown, possibly live"* rather than *"bounded, on record"*. a reviewer meets the honest severity.

## .the verdict

🔴 **RULED 2026-09-25 by the wisher: accept the deferral.** the ground given is the one this
fulcrum's SAFE/CLEAN argument rests on — **the subsystem was never touched by this behavior.**

⇒ so the deferral's basis is **untouched scope**, and it is worth the distinction: that is a firmer
ground than *"the repair looked risky"*, because it is a **fact about the diff** rather than a
judgment about the fix.

🟡 **what does NOT change:** the defect is real, its severity holds at **trigger unknown, possibly
live**, and the test that caught it stays **intact**. an accepted deferral records that the repair is
owed elsewhere — never that the defect was unreal.

⇒ the dream carries it forward:
`.dream/2026_09_24.clone-say-reports-exit-2-for-a-dispatch-that-landed.dream.md`

## .see also

- `.dream/2026_09_24.clone-say-reports-exit-2-for-a-dispatch-that-landed.dream.md` — the diagnosis,
  the two refuted stories, and the shape of the fix
- `F44` — the peer deferral raised at this same stone, for the 19 foreign skips/failhides. 🔴 **its cause was revised 2026-09-24**: they are not credential-gated
- `rule.always.fix-forward-under-scouts-honor` — the SAFE/CLEAN instrument that decided it
- `rule.forbid.failhide` — what the cheap alternative (relax the assertion) would have been
