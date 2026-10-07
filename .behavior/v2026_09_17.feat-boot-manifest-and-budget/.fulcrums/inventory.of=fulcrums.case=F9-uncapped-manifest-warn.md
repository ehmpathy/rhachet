# F9 — whether an uncapped `--manifest` warns

**rework: clean · status: 🔴 DISPLACED — the warn is CUT · confidence: 65% (the doubt was right)**

🔴 **settled by the wisher at `i013`: `S11`.** the warn is removed outright. the argument below is
kept for what it records — the 65% names the exact doubt the verdict upheld — and its outcome is
superseded by `.the displacement` at the foot.

⚠️ the second-lowest confidence in the set, and the one that sat closest to a requirement
boundary.

🟡 **`[answered]`, confirmed at `review.self r4`, and the warrant is narrow.** the wish forbids *"a
warn **INSTEAD OF** a halt"* — a warn beside a halt, on a spec that declares no cap at all, is
untouched by that forbid. and a warn is **output shape**, which `0.wish.md:115-120` delegates
(*"the halt's rendered shape"*). ⇒ mine, and the 65% is a design doubt about the split's basis, never
a permission doubt. see `.the confidence`.

---

## .the fork, stated fairly

requirement 4 says a spec with no `budget` renders as it does today. requirement 1 says a manifest
is at schema parity with a role. together they mean:

> **a `--manifest` with no budget renders, uncapped.**

which is exactly what the wish calls *"a first-class path to an uncapped custom payload… the
extant defect with a nicer syntax."*

| option | consequence |
|---|---|
| **render silently** | strict requirement-4 parity. and the wish's named hole stays open |
| **render, plus a one-line warn** | the hole is visible. one more line on a legitimate path |
| **refuse** | 🔴 violates requirement 4 and creates the second dialect requirement 1 forbids |

---

## .the guess taken, and why

**render, plus a one-line warn — on `--manifest` only.**

```
🟡 no budget declared — this payload is uncapped
   └─ add  budget: { tokens: <n> }  to bound it
```

| the argument | |
|---|---|
| the wish names this hole as the reason both halves must land together | so the hole is *known*. a warn makes it known **to the caller**, not just to us |
| a warn is not a halt | so requirement 2's *"loud hard stop, never a warn"* is untouched — that clause governs the **over-budget** case, not the undeclared one |
| it is scoped to `--manifest` | a role boot stays byte-identical, so requirement 4's blast-radius argument holds exactly |

---

## 🔴 .why the confidence is only 65%

**the scope limit is itself a parity violation, and I am not sure it is the right one.**

| the tension | |
|---|---|
| requirement 1 demands schema parity | if a role with no budget is silent, a manifest with no budget should be silent too |
| but the two sources have different **defaults in practice** | every extant role has no budget (so a warn there would fire **15** times on day one, pure noise). every manifest is **new**, so a warn there fires only on freshly-authored files |

⇒ so the warn is justified by **when adoption happens**, not by a principled difference between
the two sources. that is a weaker base than I would like, and it means the warn may deserve to
expire once manifests are commonplace.

🟡 the other live worry: **a boot's stdout is a context payload.** a warn line is one more token in
every session that uses an uncapped manifest, and it would land near the `<stats>` block a brain
reads. if it goes to **stderr** it is invisible to the payload and still visible to a human —
which is probably the right answer and is not obviously consistent with how the extant
`⚠️ No resources found` warn is emitted (`bootRoleResources.ts:121` — it uses `console.log`, so
**stdout**).

⇒ **sub-guess: stderr.** but the extant precedent points the other way, so this needs a decision
rather than an assumption.

---

## .the rework cost — why clean

one conditional plus one emit. no contract, no persisted value. trivially reversible — and, unlike
F3/F7/F8, **it does not dirty when a consumer lands**, because no consumer parses a warn.

---

## 🔴 .the guess was RECORDED and not BUILT — caught at `i010`, by a whole-artifact read

`enroll-impl-behavior-intent` ranked it finding #1 of six, and the diagnosis is exact: *"this is
not a disclosed-and-accepted gap like the others below — it's simply absent, with the fulcrum that
would have closed it left unresolved."*

⇒ **the header above read `status: ANSWERED` while `src/` carried no warn at all.** measured:
`rhx grepsafe --pattern 'uncapped|no budget|budget declared'` over `src` returned 36 lines and not
one of them was an emit — every `no budget declared` hit was a docblock about requirement 4's
*render-as-today* branch, which is the opposite case.

🔴 **that gap is a defect class of its own, and it is worth more than this cell.** a fulcrum records
a DECISION; it does not carry it out. an `ANSWERED` status with an unbuilt guess reads exactly like
a built one from the inventory, and no round before `i010` caught it — because a per-round rubric
grades what the diff CHANGED, and this guess changed no file to grade.

🔴 **it was then BUILT, clamped on both sides, and CUT one round later.** the build and the cut are
each recorded, because the pair is what makes the lesson legible: a guess held at 65% survived a
full implement-and-clamp cycle before a human read the render and struck it in one sentence.

---

## 🔴 .the displacement — the warn is CUT

**the wisher, at `i013`:** *"yeah, do nothing if no budget in manifest."*

⇒ archived as `S11`. the two arguments, and the second is the one the 65% was pointed at:

| the argument | |
|---|---|
| **requirement 4 pins the RENDER** | a `boot.yml` with no `budget` renders *as it does today*, and a warn is a render change. the *"scoped to `--manifest`, so a role boot stays byte-identical"* defence answers the blast-radius half and never the parity half |
| 🔴 **it graded a decision the contract GRANTS** | the cap is **opt-in by construction** (requirement 4 is the whole point). so a spec with no budget has exercised a sanctioned choice, and a warn on it advises against a thing the contract permits — which is what `rule.forbid.overzealous-blockers` names one level up, applied to a render |

🔴 **the second argument is what the 65% could not reach.** the confidence section below states the
doubt correctly — *"the warn is justified by **when adoption happens**, not by a principled
difference"* — and then keeps the warn anyway. ⇒ **a doubt named and not acted on is a doubt
recorded, never a doubt resolved.** the record was worth its line: it named the exact defect, and a
reader with the authority to act closed it in one sentence.

🟡 **and the hole the warn existed to cover does not reopen.** the wish's *"first-class path to an
uncapped payload"* worry is answered by the command whose job it is:

```
rhx roles cost              # what does THIS spec cost?
rhx roles cost --all        # what do ALL the specs cost — budgeted or not?
```

⇒ a **report** is the right surface for a cost a caller did not cap. a **warn** is a refusal wearing
a report's clothes, and it fired on a file that broke no rule.

## .where

- `src/domain.operations/invoke/bootRoleResources.ts` — the emit site, now a `🔴 .note` that records
  the cut and points at `roles cost`
- ~~`src/domain.operations/boot/asBootUncappedWarnLines.ts`~~ — **deleted**
- `blackbox/cli/roles.boot.manifest.acceptance.test.ts` `[case1][t0]` — the clamp, inverted: it now
  asserts NO advisory on **either** stream
- `blackbox/cli/roles.boot.budget.acceptance.test.ts` `[case1]` — the same negative clamp, on the
  role-default arm
- `1.vision.experience.case=5.no-budget-renders-as-today.md` — `[t2]`, the cell that raised it
- `.seeds/inventory.of=seeds.case=S11-*` — the ruling verbatim

## .the verdict

🔴 **CUT.** a spec with no `budget` emits no advisory of any kind, on either stream, from either
source. the 65% was well-placed and under-acted-on — the doubt it named is exactly the ground the
cut stands on.
