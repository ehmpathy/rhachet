# fulcrum F19 — `computeCloneSayRetryAdvice` ships with no production consumer

surfaced by the r011 (enroll-impl-arch-defects) L3 review of `5.1.execution.from_vision`,
decompose-for-recompose item 4. a **clean**, wisher-scoped `rule.prefer.wet-over-dry` call.

## .the fork stated fairly

`computeCloneSayRetryAdvice.ts` is fully built, tested, and documented — and has **zero
production consumers** (confirmed by grep: only its own `.test.ts` references it). its docblock
cites a future "supervisor daemon" that does not exist in this repo. it is the retry-contract
half of the vision (the three-way re-send split) rendered as a pure transformer, ahead of the
caller that would read it.

| option | the shape | cost |
|---|---|---|
| **A — keep it (current)** | the retry-advice transformer ships with this PR, tested, its consumer still awaited | a shipped surface with no caller — the `wet-over-dry` smell the reviewer names |
| **B — delete it, re-add with its consumer** | the transformer waits for the supervisor daemon that reads it | the retry contract (a loud vision benefit) has no code artifact until that daemon lands; the tested logic is re-derived later |
| **C — wire it into the say json** | `retry` rides beside `verdict`/`reason`/`probe`, so the CONSUMER is every machine caller of `clone say --output json` | one additive field + its snapshot churn |

### 🔴 the amendment — option C, added 2026-09-16

**the fork as first stated is a false binary.** it reads as *ship-ahead-of-use* vs *wait*, and
both options assume the consumer must be a future in-repo daemon. it need not be.

the consumer that closes the smell **already exists and is already shipped**: every machine caller
of `clone say --output json`. the payload is additive by design (V8, V13), so one field closes it:

```jsonc
// measured 2026-09-16 — what a real say returns today
{ "delivered": true, "verdict": "released", "reason": null,
  "probe": "capable", "serial": "516f581b-…", "slug": "racetest" }
//                                          ↑ no `retry`
```

⇒ so a daemon that reads this payload **must hand-roll the three-way switch from the vision's
prose** — which is the exact mis-derivation hazard `computeCloneSayRetryAdvice`'s own docblock
names (*"one mis-derived branch away from the exact hazard the design exists to prevent — a blind
re-send into a `buffered` state that appends and wedges"*).

⚠️ **that makes the no-consumer smell and the reliability gap ONE defect, not two.** option A
leaves a tested contract unreachable; option B deletes it and leaves the caller to derive it
anyway. C is the only option under which the contract is both tested **and** reachable by the
party that needs it.

| what C changes | |
|---|---|
| behavior | 🔴 none — the field is derived from the verdict already computed |
| the tree render | untouched (V13: the human line holds byte for byte) |
| the json | additive only (V8) |
| snapshots | the wish's own new say-json snapshots re-snap |

**why it is still UNRULED and not taken.** the fulcrum reserves a `wet-over-dry` ship/wait call
for the wisher. C is a third answer to that same question, never an escape from it — to wire it
unilaterally would settle a reserved call by side effect, which
`rule.always.raise-a-blocker-a-taken-cannot-close` (the fulcrum-council clause) forbids.

⇒ **the discovery is the contribution; the choice stays the wisher's.**

## .taken, and why at the time

**A (keep), surfaced as this fork.** the vision names the retry contract as its loudest benefit
(*"a daemon's retry policy becomes writable"*) and renders it as a three-way table; the
transformer is that table made executable and clamped by a unit test. it is pure, isolated, and
carries no runtime cost until called — so the `wet-over-dry` hazard (a wrong abstraction that
couples callers) is low: there is one caller shape, and the transformer encodes exactly the
vision's table. but a ship of a surface ahead of its consumer is a real call the wisher owns.

## .rework, and why

**clean.** the file is a pure transformer with one test and no importer — a delete touches
two files and no caller. reversible in either direction.

## .confidence 62%, and why it is low

`rule.prefer.wet-over-dry` genuinely cuts against a ship ahead of use, so the reviewer's B is
defensible; but the vision explicitly declares the retry contract as a deliverable, so A is
defensible too. i cannot tell from here which the wisher weighs heavier — the declared benefit
or the no-consumer smell — and the call is theirs.

## .where

`computeCloneSayRetryAdvice.ts` + `computeCloneSayRetryAdvice.test.ts` (the whole surface;
no other importer).

## .the demos that RENDER this call

**NONE.** no `case=N` demo calls `computeCloneSayRetryAdvice` — the retry contract is rendered
as a vision table (`1.vision.yield.md` `.the retry contract`), not as a demo assertion. a
verdict for B deletes a transformer no demo references, so no demo becomes an unvoted change.

## .the verdict

unruled. a `rule.prefer.wet-over-dry` ship/wait call the wisher owns.
