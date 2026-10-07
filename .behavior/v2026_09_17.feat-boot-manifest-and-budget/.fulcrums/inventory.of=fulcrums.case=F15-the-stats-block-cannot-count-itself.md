# F15 — the stats block cannot count itself

**raised at `5.1.execution`, 2026-09-18** — the first fulcrum found by a build rather than a read.

🔴 **RE-DECIDED at peer review round 1, same day.** the guess below (option A — exclude the two
stats blocks) was raised as a **blocker** by a peer lane, conceded, and reversed to **option B**.
the record is kept whole because the argument that lost is the instructive half.

`F12` settled *what counts as payload*: **the full rendered payload**, and it enumerated the chrome
the extant counter omits — ref lines, the `<also>` block, and *"the **XML chrome** — `<readme
path="…">`, `</brief.say>`, **the `<stats>` block**, blank lines"*.

⇒ the build of that surfaced a mechanical fact no read of the code could have shown: **the `<stats>`
block reports the token count, so to count it is self-referential.**

---

## .the fork

the `<stats>` block holds the very number the gate computes:

```
  ├── chars = 227271
  └── tokens ≈ 56818 ($0.17 at $3/mil)
```

and it is emitted **twice** — a header before the body, a footer after it
(`bootRoleResources.ts:189, 255`). so:

> to render the stats, the total must be known. to know the total, the stats must be rendered.

| option | the cost |
|---|---|
| **A — exclude the two stats blocks**; gate the body | a bounded, invariant undercount. the number is well-defined in one pass |
| 🔴 **B — iterate to a fixed point** (count body, render stats with the candidate, re-count) | exact, and it introduces a self-referential loop whose convergence rests on the total's **digit count** holding stable across the correction |
| **C — render the stats with a fixed-width placeholder**, count, then substitute | exact-ish, and it pins the rendered width of a line a human reads to the counter's internals |

---

## 🔴 .the answer taken — option B, iterate to a fixed point

**the budget gates the WHOLE emitted render: both `<stats>` blocks, the readme, every say block,
every ref line, the `<also>` block, and all XML chrome.**

| the argument | |
|---|---|
| 🔴 **a budget caps CONTEXT OCCUPANCY** | a stats block occupies context exactly as a brief does. what an author can *remedy* is a different question from what a cap must *measure* — and it was the wrong test |
| 🔴 **to omit two emitted blocks is a SCOPE error** | and a scope error is the **larger half of the 3.29x** requirement 7 exists to kill — 2.72x scope × 1.21x divisor. option A repaired the divisor and reopened a slice of the scope |
| 🔴 **it errs LOW** | the direction that **passes an over-budget boot** — the silent pass requirement 2 forbids outright |
| the self-reference is **bounded**, not open | the block's rendered length moves only when the **digit count** of the number it prints moves. so the sequence is monotone from a body-only seed and settles in two passes; a cap of four turns a pathological oscillation into a terminated loop rather than a hang |
| all three gates now share ONE count | introspect, `onStop`, and boot measure the same string. a spec that clears gate 1 cannot halt on a consumer's boot because the two disagreed on what it costs |

### 🔴 why the argument that lost was seductive

option A's case rested on one line: *"a budget must gate what the author can CHANGE."* it reads as
a principle and it is a **category error** — it conflates the **measurement** with the **remedy**.

⇒ and a bag at the gate is weighed with its own tag on. the airline does not deduct the tag because
you cannot remove it.

🟡 **the tell was on the page and I did not read it as one:** the entry's own *"what it costs"*
section conceded the error ran in **the direction `F1` calls dangerous**, and then dismissed it on
**size**. a self-declared error in the forbidden direction, argued down to a quantity too small to
matter, is exactly the shape a reviewer is built to catch — and did.

---

## .what it costs, stated plainly

- the count is **SELF-REFERENTIAL**: the stats block reports the number it is part of. that is a
  real oddity, and it is the honest one — the alternative is a block that prints a number the render
  it sits in does not measure to, a number **wrong about itself**
- the loop is capped at **four passes**. a payload that failed to settle would return the last
  pass's count rather than spin — a bound worth a mention, never a case observed
- each pass counts the **exact emitted string** (`[stats, body, stats]`), never a sum of separately
  counted parts. a token can span a join boundary, so a sum of parts is an approximation — which is
  what this operation exists to retire
- ✅ the ~110-token undercount option A disclosed is **retired**. the residual set is now one item:
  the count is exact for `o200k_base` and approximate across model families

## .the clamp

`calcBootPayloadTokens.test.ts` `[case4]` proves three things, and it was **verified to bite**
(`PASSES_MAX = 0` → 14 passed became 11 passed / 3 failed; restored → green):

| the assertion | what it forbids |
|---|---|
| `counted.tokens > countedBodyOnly.tokens` | the scope error — a body-only count |
| `(counted − bodyOnly) / 2 > 5` | a **one-block** count, which would land at half the gap |
| `rendered.length === counted.chars`, where `rendered` is the block re-rendered with the RETURNED total | 🔴 the fixed point, stated directly — a count that did not converge fails it |

## .what would overturn it

- a stats block whose rendered length varied with aught **other than** the total's digit count —
  then the feedback would stop to be bounded and the loop's convergence claim would need a new proof
- a payload large enough that a four-pass encode is a real cost. ⇒ `F1`'s open item `2′` already
  names the answer: precompute the count at gate 1 into `rhachet.repo.yml`, so gate 3 is an integer
  comparison with no tokenizer at all

## .the confidence — 97%

| confident | not confident |
|---|---|
| the scope argument is decisive, and it is requirement 7's own words | whether four passes is the right cap, or whether two with a loud throw on non-convergence would be more honest |
| the fixed point is clamped by a test proven to bite | — |

## .where

`src/domain.operations/boot/calcBootPayloadTokens.ts` — the convergence loop.
`src/domain.operations/boot/assertBootWithinBudget.ts` + its three call sites — the shared count.

## .the verdict

🔴 **option B, by concession at peer review round 1.** the fork is closed.

## .see also

- `inventory.of=fulcrums.case=F12-what-counts-as-payload.md` — the fulcrum this implements, and
  whose enumeration named the `<stats>` block from the start
- `inventory.of=fulcrums.case=F14-budget-zero-defect-or-policy.md` — the ref-only spec whose cap is
  chrome-sized. 🟡 option B **strengthens** `F14`: with chrome in scope, `budget: 0` cannot be met by
  any spec, which is exactly why it refuses at parse
- `inventory.of=fulcrums.case=F1-token-counter-choice.md` — the divisor residual this sits beside
