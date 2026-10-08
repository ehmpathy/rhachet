# F14 — is `budget: { tokens: 0 }` a defect, or a policy?

**rework: clean · status: ANSWERED · confidence: 🔴 95% (was 70%)**

## 🔴 .RESOLVED 2026-09-18 — its 30% doubt was F12's, and F12 is settled

this fulcrum's own confidence table names the whole of its residual doubt: *"the 30% is
F12-dependent, and that is the whole shape of it."* **wish requirement 7 settles `F12` on the full
emitted payload**, so the two-row table below resolves to its second row:

> ❌ **`budget: 0` is unsatisfiable by construction.** `<brief.ref>` lines and XML chrome are nonzero
> for any spec at all, so a 0-token cap refuses **every** boot — the ref-only one this fulcrum
> argued for among them.

⇒ **the refusal holds, and now it holds for the stated reason rather than by accident.** the
re-written justification this fulcrum exists to demand is therefore final: **`0` is refused because
it cannot be met, never because nobody meant it.**

🟡 **and the ref-only assertion is still a real use the vision missed** — it is merely not served by
`0`. the honest form is `always.briefs.say: []` plus a `budget` that admits the chrome, and that is
a criteria-stage shape rather than a fork.

🔴 **the residual 5% is no longer about `0` at all.** it is whether the value domain belongs in this
wish's scope, or is a criteria-stage schema detail — a placement question, not a design one.

---

🔴 **the vision refused it on INTENT grounds — and its own justification concedes the counterexample
in the same sentence.**

🟡 **`[answered]` because it DERIVES from `F12`, confirmed at `review.self r4`.** whether `0` is
satisfiable at all is decided by what counts as payload — satisfiable under say-content, unsatisfiable
under the full rendered payload (chrome alone is nonzero). `F12` is mine (*"the counter you pick"*),
so this is too. **no wisher input is owed on either.**

---

## .the call as made

`1.vision.experience.case=_.md:174`, axis E:

| value | verdict | the refusal |
|---|---|---|
| `zero` | **forbidden** | *"a 0-token cap refuses every **non-empty** boot. legal to type, never intended — refuse with the fix"* |

and `1.vision.yield.md:375`:

> *"a `budget: 0` — refuse at parse — a budget that admits no payload is a defect, not a policy"*

⚠️ **the wish says naught about `0`.** requirement 5 governs *"an absent or malformed manifest
**path**"*; the budget's **value** domain is entirely the vision's invention. so this is an inferred
requirement, and it was never itemized.

---

## 🔴 .the refusal's own words name the exception

read the justification again: *"refuses every **non-empty** boot."*

⇒ **the qualifier concedes that an EMPTY boot passes a 0-token cap.** so the row establishes that
`0` is satisfiable, and then refuses it because it was *"never intended"* — which is a claim about
the author's mind, not about the value.

## .and an empty resident payload is a real, useful spec

a **manifest** has no readme (`F8`), so a manifest whose every entry sits under
`always.briefs.ref` has a resident payload of **zero** under the extant sum:

```yaml
budget:
  tokens: 0          # assert: this boot is ref-only. no resident payload, ever.
always:
  briefs:
    ref:
      - '1.vision.experience.*.md'
      - '.fulcrums/*.md'
```

that spec makes a precise, enforceable claim: **"every doc here is addressable, none is
resident."** it is arguably the *strongest* use of a budget — a hard assertion of zero residency,
which a positive cap can only approximate.

⇒ and it is exactly the shape this route wants. a route manifest with 20 experience demos cannot
afford them resident; `budget: 0` is how an author **proves** they did not.

| the read | what `0` asserts |
|---|---|
| the vision's (taken) | a typo. nobody means it. refuse at parse |
| 🔴 **the one it missed** | *"ref-only, and I want that enforced."* a policy, and the sharpest one available |

---

## .the fork, stated fairly

| option | the cost |
|---|---|
| **refuse `0` at parse** (taken) | forbids the ref-only assertion. one schema predicate: `.positive()` |
| **permit `0`, refuse negatives** | `.nonnegative()`. an author who typos `0` gets a halt on their first non-empty boot, with the remedies — which is the feature at work, not a defect |
| permit `0` only where the spec declares no `say` | a cross-field schema rule; a third state to explain |

---

## 🔴 .the entanglement nobody recorded — its sense depends on F12

whether `0` is **satisfiable at all** is decided by whichever quantity `F12` settles on:

| F12 settles on | what `budget: 0` asserts |
|---|---|
| say content alone (status quo) | ✅ **satisfiable** — a ref-only manifest sums to 0. the policy read is live |
| 🔴 **the full rendered payload** (F12's guess) | ❌ **unsatisfiable** — `<brief.ref>` lines and XML chrome are nonzero for any non-trivial spec. `0` really does refuse every boot |

⇒ **so the two fulcrums are entangled, and in the direction that favours the extant guess.** under
F12's own best-guess, the vision's refusal of `0` turns out **correct** — but for a reason the
vision never gave, and which was unavailable to it, since F12 did not yet exist.

🟡 **that deserves a plain statement rather than a claim of vindication.** the call was right by
accident. a reader who inherits *"a 0-token cap is a typo"* inherits a true conclusion with a false
argument, and the false argument is what fails the next time it is applied.

---

## .the guess taken, and why

**hold the refusal of `0`, and re-state its reason.**

| the reason to drop | the reason to keep |
|---|---|
| — | under `F12`'s guess, `0` is unsatisfiable by construction, so to permit it is to permit a spec that can never boot |
| — | `define.invariant.empty-render-names-its-cause` — a refusal at **parse** names the cause once, where a refusal at **every boot** names it forever |
| the ref-only assertion is real and useful | 🟡 and it is served better by a different feature: an explicit `always.briefs.say: []` plus a `budget` that reflects the chrome |

⇒ **the honest summary: `0` is refused because it cannot be met, never because nobody meant it.**
the axis-E row's justification should be re-written accordingly, and it is the artifact defect this
fulcrum exists to fix.

---

## .the confidence — 70%

| confident | not confident |
|---|---|
| the extant justification (*"never intended"*) is a wrong argument | whether `0` should be refused **at all**, if F12 settles on say-content |
| the ref-only assertion is a real use the vision missed | whether that assertion deserves its own syntax |
| an intent claim is not a schema argument | whether this is in scope, or a criteria-stage detail |

🟡 **the 30% is F12-dependent, and that is the whole shape of it.** settle F12 and this fulcrum
resolves to one of two clear answers. **it cannot be settled first.**

---

## .the rework cost — why clean

one zod predicate (`.positive()` ↔ `.nonnegative()`), one axis-E row, one edge-case row, and the
rejection snapshot. no persisted value, no contract a consumer reads.

---

## .where

- `1.vision.experience.case=_.md:169-177` — axis E, the four value verdicts
- `1.vision.yield.md:375-376` — the edge-case rows
- `0.wish.md` requirement 5 — governs the manifest **path**, and says naught of the budget's value
- `src/domain.objects/RoleBootSpec.ts:39-43` — where the predicate lands (`F5`)
- `define.invariant.empty-render-names-its-cause` (repo=.this) — the argument that carries the keep

## .the verdict

_(open — for the fulcrum council)_
