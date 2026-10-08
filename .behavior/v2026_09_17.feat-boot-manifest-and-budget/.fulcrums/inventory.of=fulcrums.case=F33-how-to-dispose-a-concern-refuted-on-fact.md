# F33 — how to dispose a concern that is REFUTED ON FACT?

- **raised** = 2026-09-23, at `5.1.execution.from_vision`, by the **absorption grammar itself**
- **rework** = clean
- **status** = ANSWERED
- **confidence** = **91%**

---

## .the fork, stated fairly

`i014` returned 11 lanes. **13 of their concerns quote a line that no longer exists** — the lane read
a tree one round old, and the repair it asks for had already landed. r007's blocker.2 is the sharpest
case: its thesis and the repair's docblock are the **same argument from the same evidence**.

the engine offers exactly two dispositions, and a stale-read concern fits neither cleanly:

| | **`--as conceded`** | **`--as disputed`** |
|---|---|---|
| what it asserts | *"you are right; I will fix it"* | *"this does not hold; here is the argument"* |
| is it true here? | 🔴 **no.** there is no fix left to make — the concern IS the shipped behavior | ✅ **yes in substance** — the concern does not hold against the current tree |
| what it costs | a `--severity` grade on a repair that already landed, and a tally row that reads as debt | 🔴 **a `--why <fulcrum>`, and there is no FORK** — I weighed no alternative |
| the residue | the record says a defect was open at i014 when it was not | a fulcrum row that reserves a question nobody asked |

⇒ **the grammar assumes every concern is either an open debt or a live disagreement.** a third state
exists and is common on a tree that moves fast: **a concern that was correct when written and is
answered by the code before it was read.**

---

## .the call, and why — at the time

**`--as disputed`, with this fulcrum as the `--why` for every refuted-on-fact concern.**

the argument, in order:

1. 🔴 **`conceded` would falsify the record.** a concede is a *commitment to fix*
   (`rule.always.absorb-every-concern`), and it carries a severity graded by shipped harm. to grade
   a repair that already shipped is to invent a harm that never reached a caller — and the tally
   would then carry debt rows for work the diff already holds.
2. **`disputed` is honest about the substance.** the concern does not hold against the tree the
   council will read, and the `.taken` quotes the current file to prove it. that is exactly what a
   `[REFUTE]` is.
3. 🟡 **so the only awkward half is the `--why`, and this file is what discharges it.** the engine
   demands *"cite the argument they will read"* — and the argument they will read is not a fork
   between two designs. it is **this**: that a stale-read concern is disposed by refutation rather
   than by re-concession, and the council may overrule that.

### the disposal, stated as a rule

| the concern | the disposition | its `--why` |
|---|---|---|
| quotes a line the tree still holds, and the ask is un-met | **conceded** + severity | — |
| quotes a line the tree still holds, and I disagree on design | **disputed** | the fulcrum that owns that fork |
| 🔴 **quotes a line that no longer exists** | **disputed** | 🔴 **this row** |

---

## .why the confidence is 91% rather than higher

**the 9% is a real doubt about the INSTRUMENT, not about the call.**

a fulcrum row exists to surface a **judgment a council may overrule**
(`rule.always.itemize-the-fulcrums-you-best-guess`). this row surfaces a judgment about **how to
operate a tool**, which is one step removed from the work. ⇒ so a reader could fairly say the row is
a workaround dressed as a decision, and that the honest artifact is a **dream against the engine**
rather than a fulcrum in this route.

🔴 **the counter, and it is why the row stands:** the choice genuinely changes what the council
reads. dispose these as `conceded` and the tally reports 13 open defects at i014; dispose them as
`disputed` and it reports 13 refutations. **those are different claims about the state of the
work**, and the difference is exactly the kind a fulcrum exists to put in front of a human.

🟡 **and the doubt names its own follow-up.** if the engine grew a third verb — a `--as refuted`
that takes a **file quote** rather than a fulcrum path — this row would be void, in the way `F19`
and `F31` went void when their subjects were cut. that is a real gap in the absorption contract, and
it belongs upstream rather than here.

---

## .where

- every `[REFUTE]` disposition in the `i014` takens whose evidence is *"that line is gone"* —
  `r006` blocker.1/blocker.3/nitpick.1/nitpick.2, `r007` blocker.2, `r010` blocker.1,
  `r011` §A/§B/§C×3/§D×2
- `.reviews/peer/…i014….rNNN._.taken.by_self.*.md` — each quotes the current file at the line the
  review quoted stale

## .the verdict, once ruled

_(open — for the fulcrum council)_
