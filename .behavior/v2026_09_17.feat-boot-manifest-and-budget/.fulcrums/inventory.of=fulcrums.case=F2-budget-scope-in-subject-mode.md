# F2 — budget scope in subject mode: the render, or the whole spec?

**rework: clean · status: ANSWERED · confidence: 88%**

🔴 the **latent axis** the dimensional walk surfaced. no free-list would have asked it.

---

## .the fork, stated fairly

a subject-mode spec renders a **different payload per invocation** (`--subject a,b` boots
`always` + the named subjects, `computeBootPlan.ts:244-403`). so one `budget.tokens` value has two
possible referents:

| the read | the cap bounds | consequence |
|---|---|---|
| **the render** | what this invocation actually emits | `--subject review` passes; `--subject review,pavement` may halt |
| **the whole spec** | always + every subject, regardless of what was asked | a narrow boot halts on payload it never emitted |

⇒ they differ by a **4x factor** on the bhrain driver role (6,000 vs ~24,000 tokens).

---

## .the guess taken, and why

**the render.** the budget caps **what is actually emitted into context.**

| the argument | |
|---|---|
| it is the quantity the incident measured | the ~46% figure was *occupancy of one session*, not the size of a spec on disk |
| the other read makes budgets unusable for big roles | a subject-mode spec exists *because* it is too big to boot whole. to cap the whole is to cap the very case subject mode was invented to avoid |
| it refuses no boot that costs naught | an un-rendered subject occupies no context, so to charge for it is to refuse a payload the caller never received |
| it makes `--subject` a **remedy** | `case=6`'s halt can offer *"narrow the boot"* as a fix, which only makes sense under this read |

⇒ and it reframes the feature usefully: **`budget.tokens` is a bound on a render, not an
attribute of a file.** the spec declares the bound; the invocation decides what is measured.

---

## .the confidence — 88%

| confident | not confident |
|---|---|
| the render is the right referent | whether an author *expects* it with no prompt |
| the 4x divergence is real | whether a spec should *also* be able to cap its whole (two keys?) |

🟡 the 12% is a legibility worry, not a correctness one: `budget: { tokens: 8_000 }` reads like a
property of the file. an author may declare 8,000 while they hold the whole spec in mind, then be
surprised a 3-subject boot halts. **the `<stats>` line must therefore name what was in scope** —
`tokens ≈ 6000 / 8000 budget (subjects: review)`.

---

## .the rework cost — why clean

| what changes if the council flips it | |
|---|---|
| the point the budget is measured at | one call site — after `computeBootPlan`, before the render |
| the `<stats>` scope annotation | one line |
| `case=6`'s remedy list | the `--subject` fix drops out |

⇒ no caller depends on the choice, and no declared budget value exists yet to re-calibrate. **the
flip is a one-site change while no spec has adopted a budget** — which is exactly why it must be
decided *before* release, not after.

---

## .where

- `src/domain.operations/boot/computeBootPlan.ts:244-403` — the subject-mode plan
- `src/domain.operations/invoke/bootRoleResources.ts:84-101` — `--subject` validation + plan call
- `1.vision.experience.case=6.subject-scoped-budget.md` — the demo
- `1.vision.experience.dimensions.md` — where the axis surfaced

## .the verdict

_(open — for the fulcrum council)_
