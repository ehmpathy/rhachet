# F31 — key the sweep's silence on the VERDICT now, or defer?

- **rework** = clean
- **status** = 🔴 **MOOT — the question DISSOLVED, never answered**
- **confidence** = 82% (the deferral was right, twice, and for a reason narrower than it knew)
- **where** = ~~`src/contract/cli/invokeRolesBudget.ts`~~ — **deleted**; the sweep is now
  `roles cost --all`
- **raised** = 2026-09-21, at `5.1.execution.from_vision` i011 (`enroll-impl-behavior-intent` nitpick.3)

🔴 **read `.the dissolution` at the foot first.** this file records a question that had no answer
because it had no subject — see `S14`.

---

## .the fork

the sweep is silent when **zero** specs declare a budget. a peer lane traced that premise forward:
once any linked package adopts `budget:`, every author sees the full roster on **every** `onStop`,
forever — however many specs are within their cap.

| the silence rule | speaks when |
|---|---|
| 🔴 **population-keyed** (today) | any spec is budgeted |
| **verdict-keyed** (the fix) | any spec is OVER its cap |

these coincide only while the count is zero, which is every repo today.

| option | what it costs |
|---|---|
| **A** — key on the verdict now | changes **when the gate speaks**, which the wish never bounds |
| 🔴 **B** — defer, dream it, record the call (taken) | the sweep gets noisier as the feature is adopted |
| **C** — add `--verbose` and default to quiet | same scope question as A, plus a new flag surface |

---

## .taken, and why

**taken: B — defer, with the dream that carries the shape of the fix.**

1. 🔴 **it is a SCOPE call, never a ripple.** `0.wish.md` requirement 9 asks that the gate fire
   *where the author can write the file*; it says naught about how loud a within-budget sweep is.
   to answer that in the final round settles by side effect a question the wish reserved
   (`rule.always.defer-fulcrums-to-last`).
2. **the lane grades it the same way** — *"not a defect, since the vision never bounds it, but worth
   a note for the driver"* — and raised it as `[nitpick][better]`.
3. 🟡 **the trigger has not occurred.** no spec in any repo declares a `budget` today, so the noisy
   state is unreachable until an upstream author adopts one. a deferral costs naught until then.

⚠️ **and A is genuinely cheap, which is the case against B.** `getAllSpecsOverBudget({ checked })`
already computes the exact set the fix would key on, so the change is one guard on the emit. what
holds it is the scope question, never the implementation cost.

---

## 🔴 .the residual 18% — the docblock already states the rule it does not implement

`invokeRolesBudget.ts` says, in its own words:

> *"a gate that speaks on every session stop is a gate an author learns to scroll past."*

⇒ **that is the verdict-keyed principle, written down, beside a population-keyed implementation.**
so B defers a fix the file's own docblock argues for — which is a weaker position than a deferral
whose principle was never settled.

🟡 **and it is the same defect class this very round repaired one layer down**: `calcBudgetPercentUsed`'s
docblock claimed a reuse the body below it did not hold to (r011 §1). ⇒ **a docblock that states a
principle is not evidence the body implements one**, and that lesson now has two instances in one
round.

---

## 🔴 .why no prior round caught it — the part worth more than the row

eleven rounds, eleven lanes, zero raises. the reason is structural rather than inattention:

> **today the sweep is silent, so there is no output to grade.**

⇒ a per-round rubric reads a render. a defect whose trigger has not fired yet **emits naught to
read**, so it is invisible to every rubric that grades output. only a lane that traced the silence
*rule* to its premise could see it — which is what this one did.

---

## .what would flip it

the first upstream role package that ships a `budget:`. at that moment the noisy state is real
rather than forward, and the scope question is answered by observation rather than by argument.

---

## .the clamp

`blackbox/cli/roles.budget.acceptance.test.ts` `[case3a]` — three budgeted specs, all within, with
a positive assertion that the roster prints **a row per spec**. it pins the population-keyed
behavior deliberately, so a later move to verdict-keyed silence must redden it first
(`rule.require.clamp-edge-cases`).

---

## 🔴 .the re-raise at i013 — and the verdict was RE-TAKEN, then REVERSED

**2026-09-22.** the same lane re-raised this at i013 and escalated it from `[nitpick]` to
`[blocker]`. I **conceded** it and built option C: a caller-scoped `--only-when-over` flag on
`roles budget`, with the `onStop` hook and this repo's own `.claude/settings.json` pointed at it.

🔴 **the wisher struck it in three questions** — *"what is it / when did we authorize that / why did
you do that"* — and the whole change was reverted: the flag, the hook command, the settings edit,
and the `[case7]` that graded it.

⇒ **the deferral above was already correct, and I overturned it under a severity bump.** what
changed between i011 and i013 was the reviewer's *grade*, never the *argument* — and §1 above
("it is a SCOPE call, never a ripple") is untouched by a grade.

### 🔴 what a concede COMMITS to, and why that is the trap

`rule.always.concede-with-a-severity` makes concede the default and dispute the escalation, so
concede reads as the humble move. it is not, where the fix is a **contract surface**:

| the disposition | what it commits me to |
|---|---|
| `conceded` | **fix it** — here, ship a new CLI flag the wish asks for nowhere |
| `disputed` | shed it from the tally, and cite the fulcrum that already ruled |

⇒ **a concede on a scope question settles the scope question by side effect**, which is the exact
failure `rule.always.defer-fulcrums-to-last` names and which §1 above already refused once.

### 🔴 .the test this row derived — and it was STRUCK the next day

this row once carried a test of its own invention:

> ~~**does the fix add a surface a CALLER can see?** — yes → dispute and cite the fulcrum.~~

🔴 **the wisher struck it in one question: *"dont you have fulcrum rules that explain this for you
already?"*** — and the answer is yes. `rule.always.raise-a-blocker-a-taken-cannot-close`'s
fulcrum-council clause, **booted into every session of this route**, already says it and says it
better:

| the derived test | the extant rule |
|---|---|
| *"does the fix add a surface?"* | *"does an itemized fulcrum already reserve this call?"* |
| a **judgment** — what counts as a surface? | 🔴 **mechanical** — a `Glob` of `.fulcrums/` answers it |

⇒ the extant rule also names the correct ACTION, which the derived one omitted: **halt, and hand up
both the objection and the fulcrum row** — not merely dispute. ⇒ `S15`.

🟡 **residency is not readership.** the rule was in context for every round of this stone, and the
drive still wrote a worse copy of it. ⇒ **the reflex a defect should trigger is a SEARCH, not a
draft.**

---

## 🔴 .the dissolution — the question had no subject

**2026-09-22, `S14`.** the wisher cut the `onStop` hook entirely: the sweep is human-invoked, and
no more than that.

> **this fork existed ONLY because the sweep fired unprompted.**

| the fork asked | under a human-invoked sweep |
|---|---|
| *"how loud should a within-budget sweep be?"* | 🔴 **as loud as the human who typed it wants** |
| *"an author scrolls past it on every stop"* | there is no stop. there is a command they ran |

⇒ **population-keyed vs verdict-keyed was a question about a gate nobody asked for.** with the hook
gone, a full roster is not noise — it is **the answer to the question the caller typed**, and a
report that hid its within-budget rows would be the defect.

🔴 **and the sweep's HOME moved too**, which retires the row's `where` line: it is now
`roles cost --all` (`S13`), because `budget` names a LIMIT where the sweep renders a REPORT. a
report that refuses is not a report.

### 🟡 what this row was RIGHT about, twice

the deferral held at i011 and was overturned at i013 under a severity bump — and **the wisher then
reverted the overturn**. so §1's argument (*"it is a SCOPE call, never a ripple"*) was correct both
times, and the concede that broke it is the lesson the row now carries.

⇒ **a fulcrum that defers correctly is not vindicated by the outcome alone.** it was vindicated
here because the wisher's cut removed the subject — which is a stronger result than "the deferral
aged well", and one no round could have predicted.

---

## .see also

- `.seeds/inventory.of=seeds.case=S14-the-sweep-has-no-hook.md` — the cut that dissolved this
- `.seeds/inventory.of=seeds.case=S13-fold-the-sweep-into-cost.md` — where the sweep now lives
- `.seeds/inventory.of=seeds.case=S15-the-rule-was-already-resident.md` — the struck test
- 🟡 its dream — `2026_09_21.the-onstop-budget-sweep-has-no-upper-bound-…` — went moot for the same
  reason and was **pruned**, so this row is the record that outlived it
- `.dream/2026_09_22.a-concede-on-a-scope-question-settles-it-by-side-effect.dream.md` — the concede
  lesson, re-pointed at the extant rule
- `src/domain.operations/boot/getAllSpecsOverBudget.ts` — still live: it drives the `⚠️` marker and
  the summary's count, which is what a REPORT owes in place of silence
- `rule.always.raise-a-blocker-a-taken-cannot-close` (driver) — the rule that already said it
