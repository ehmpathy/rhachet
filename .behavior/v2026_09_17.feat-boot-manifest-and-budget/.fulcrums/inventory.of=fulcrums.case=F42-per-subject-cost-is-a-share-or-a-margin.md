# F42 — is a "per-subject cost" an attributed SHARE or a MARGIN?

- **rework** = ✅ **clean** — one render block and one closure. no schema, no gate position, no
  contract a consumer branches on. a reversal swaps which number the block prints
- **status** = ✅ **CLOSED — best-guessed, MARGIN**
- **confidence** = **91%** — the dedupe makes a share *uncomputable* rather than merely awkward,
  which is a fact about the plan and not a preference. the 9% is the render's framing, not the
  quantity: an author may still read a column of numbers and try to add them
- **where** = `genBootPayload.ts` (`BootPayloadSubjects`) · `assertBootWithinBudget.ts`
  (`getAllSubjectMargins`) · `asBootSubjectMarginLines.ts`
- **raised** = 2026-09-24, at `5.1.execution.from_vision` i022, by `enroll-impl-behavior-intent`
  blocker.1 — `case=6` `[t1]` demands a per-subject cost the halt did not render at all

---

## .the fork

`case=6` `[t1]` states the requirement in one clause, and the clause carries its own purpose:

> then the halt names the per-subject cost, **so the author can drop one**

two numbers answer to that name, and they are not the same number.

| option | the quantity | what it means |
|---|---|---|
| **A** — an attributed SHARE | "subject `review` accounts for N of the payload" | the payload, partitioned across its sections |
| 🔴 **B** — a MARGIN | "a drop of `review` recovers N" | re-plan without it, re-count, report the difference |

---

## 🔴 .taken, and why — B, because A cannot be computed at all

**taken: B, the margin.** and the reason is a property of the plan rather than a preference between
two defensible readings.

`computeSubjectModePlan` **dedupes across sections**. the first section to say a resource wins; every
later section that names the same resource is demoted to `ref` or dropped
(`computeBootPlan.ts:241-242` — *"say wins over ref when both match the same resource; first
occurrence says, subsequent occurrences become ref"*).

⇒ **a shared resource's cost lands wholly on whichever section the spec happens to enumerate
first.** so an attributed share has two defects, and each is disqualifying on its own:

| the defect | what it does |
|---|---|
| it is a function of **key ORDER** | reorder two `subject.*` keys in the yaml, change no content, and the reported shares move |
| it **overstates** what a drop recovers | an author who drops the first-enumerated subject sees its shared resources re-say themselves under the second, and the payload falls by far less than the number promised |

the second is the one that grades: a halt is an **advisory**, and an advisory that misstates its own
effect is `rule.forbid.failhide`. it is the identical shape corrected earlier in this stone, where
the `reference` gloss claimed a ref line costs naught.

⇒ the margin has neither defect. it is order-independent by construction, and it answers `[t1]`'s
purpose clause **literally** — it IS what the author recovers if they drop that one.

### 🟡 .what the margin costs, stated plainly

**the margins do not sum to the payload, and they cannot be made to.**

- a resource two subjects both say is recovered by **neither** alone
- `always:` survives every drop, as do both `<stats>` blocks and all xml chrome

measured on this stone's own fixture (`with-boot-budget-subject`, `--subject review,fulcrums`):

```
payload  = 650 tokens
review   − 46 tokens
fulcrums − 361 tokens        ⇒ 407, a strict shortfall against 650
```

⇒ so the render must not invite the sum. the header reads **"what a drop of each recovers"**, never
"cost" — and the acceptance clamp asserts the shortfall from **both** sides, because a sum that
reached the total would prove the number was a share that wore a margin's label.

🟡 **and the shortfall is the useful half of the reading:** at 250 over, `fulcrums` closes the breach
and `review` does not. a share would have said neither, or both.

---

## .what would flip it

- **a wisher verdict** that "cost" was meant as an accounting partition, and that order-dependence
  is acceptable in exchange for numbers that add up
- 🔴 **a change to the dedupe** — were the plan to charge a shared resource to every section that
  says it, a share becomes computable and order-independent, and the fork reopens on its merits
- **an author who reads the roster and adds the rows** despite the header. that would promote the
  framing from a 9% doubt to a defect, and the repair is a rendered `always: + chrome` residual row
  rather than a different quantity

---

## .see also

- `1.vision.experience.case=6.subject-scoped-budget.md` — `[t1]` is the clause this answers, and
  `[t2]` is the bound it must not cross
- `F13` — why the halt names no individual RESOURCE. a subject is a different unit: it is the
  argument to `--subject`, so to name one is to name the MOVE rather than to rank a document
- `F41` — the peer defect, same grade: a render that misstated its own effect
- `rule.forbid.failhide` (mechanic) — what an attributed share would have been
- `computeBootPlan.ts:241-242` — the dedupe note that makes a share uncomputable

---

## .the verdict, once ruled — (best-guessed; no council verdict yet)
