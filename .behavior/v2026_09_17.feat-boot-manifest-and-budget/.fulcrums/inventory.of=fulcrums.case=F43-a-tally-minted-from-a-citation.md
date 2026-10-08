# F43 — a tally minted from a citation: dispute the phantoms, or halt on them?

- **rework** = clean
- **status** = 🔴 **TAKEN 2026-09-24** — disputed, with the defect re-seeded upstream
- **confidence** = 93%
- **where** = `$route/.reviews/peer/…i025.0169aae023d8329a24.r010._.given.by_peer.enroll-impl-behavior-intent.md`
- **raised** = 2026-09-24, at `5.1.execution.from_vision` i025

---

## .the fork

lane `r10` returned a review that **enumerates zero items it asks the driver to fix**. its own
bottom line reads *"the mechanism is substantively complete and well-tested against the wish's hard
requirements"*, and every live item it raises it hands explicitly to a human or a council.

it was tallied **`5 blockers / 3 nitpicks`**, and the stone was rejected.

### the measurement that settles what the tally read

🔴 **the verdict is numerically identical to i024's** — also `5 / 3`. that identity is the cue, and
a replay of the tally regex on the lane's stdout is the proof:

```
stem = blocker — 2 match(es), LAST one binds
           line 13: "5 blockers"      ← a reconstruction of the i024 stamp line
  BINDS -> line 16: "5 blockers"      ← "…claims all 5 blockers were repaired…"

stem = nitpick — 1 match(es), LAST one binds
  BINDS -> line 13: "3 nitpicks"

verdict on stdout alone = 5 blockers, 3 nitpicks
```

⇒ **both matches that bind are citations of the PRIOR round.** the regex takes the last match
(`getReviewCountsViaRegex.js:32`), and the review's only two numeric runs are both about i024.

⚠️ **and the guard built to prevent this names the case in its own docblock** (`:19-29`):

> a review whose ONLY numbers are citations reads as undetected (never a silent zero)

the guard `(?<![\w"'`])` covers a digit glued to an identifier (`r11 blocker`) and one wrapped in a
quote. it does **not** cover a space-preceded prose citation — which is the shape a reviewer
actually writes.

---

## .the fork, stated fairly

| option | what it costs |
|---|---|
| **A** — halt (`--as blocked`), ask a human to narrow the lane's bind or repair the tallier | 🔴 it spends a **human's** attention on a defect the driver can bound without one, and `rule.always.raise-a-blocker-a-taken-cannot-close`'s counter-bound forbids a halt with a lever unspent |
| 🔴 **B** — **dispute** each phantom concern, cite this fulcrum, re-seed the upstream defect as a dream | the tally is shed rather than repaired, so the **next** round can mint the same phantoms from this round's own `.taken` — see the residual |
| **C** — treat the 5 as real and hunt for five defects | 🔴 **the trap.** the review names none, so the hunt either invents work or ends in *"I misread it"* — the humbler read, and the wrong one |

---

## .taken, and why

**taken: B — dispute, with the defect re-seeded and the argument recorded here.**

1. 🔴 **dispute is a driver-owned lever, and the counter-bound forbids a halt while one is unspent.**
   `define.invariant.review.peer.absorption.disputable-regardless-of-verdict` makes any concern that
   **counts toward the tally** the driver's to dispute — *"the driver always holds a lever to reduce
   a tally its own lanes pushed over the floor."* this route has already spent it four times (the
   i024 judge reads `disputed: 0 blockers, 4 nitpicks excluded`).
2. **a dispute is the only honest disposition available.** the two dispositions are `conceded` (the
   reviewer is right — commit to a fix) and `disputed` (fine to continue — cite a fulcrum). with
   **zero** named defects there is no claim to concede to; a concede here would commit to a repair
   whose subject is absent.
3. **the defect is real, foreign, and now recorded.** it lives in a version-pinned
   `rhachet-roles-bhrain` dist file, so `rule.always.scope-onetime-lessons-to-the-behavior` sends it
   upstream rather than into this tree — caught as a `reseed` dream with the measurement, the trap,
   and three candidate fixes.
4. 🔴 **option A was weighed seriously and failed on a measurement, not a preference.** the halt's
   ask would have been *"narrow r10's bind"* — and the lever the driver briefs name for that
   (`rhx route.mutate.guard --paths-with`) **does not exist**: `route.mutate` exposes only
   `grant allow|block|get`, and `grant allow` is enforced human-only. so a halt looked correct right
   up until the dispute lever was found, which is exactly what a second opinion is for
   (`rule.always.get-a-second-opinion-before-foreman`).

---

## 🔴 .the residual 7% — a dispute sheds the tally and does not stop it recurring

the honest bound, stated rather than buried:

> **this `.taken` will itself contain the phrase `5 blockers`.** so the identical citation shape is
> now in the tree the next round's reviewer reads, and it can mint the identical phantom verdict.

⇒ a dispute is a **per-round** remedy for a **per-round** artifact. it does not repair the tallier,
and no driver-owned lever does. three things bound the risk, and none removes it:

| what bounds it | what it does not do |
|---|---|
| the dream carries a fixture-ready repro upstream | it does not land the fix |
| the dispute lever can be spent again next round | it costs a round each time |
| the numeric-identity cue is now written down | it does not fire on its own |

🟡 **and the deeper residual: a dispute is indistinguishable, from the outside, from a driver who
argued away a real rejection.** that is precisely why the measurement is quoted in full here and in
the `.taken` rather than summarized — a council must be able to re-run it rather than take the
claim.

---

## .what would flip it

- 🔴 **a single concern in that review that names a defect and asks for a repair.** the enumeration
  found zero across 15 distinct items; one would make this a concede rather than a dispute
- **the upstream fix lands**, and a re-run still reads 5/3 — that would refute the whole diagnosis
- **a human rules that a mis-tallied lane is a halt** rather than a dispute, on the grounds that a
  dispute launders a verdict nobody verified

---

## .see also

- `.dream/v2026_09_24.reseed.the-tally-citation-guard-misses-a-prose-citation.md` — the measurement,
  the probe's own trap, and the three candidate fixes
- `define.invariant.review.peer.absorption.disputable-regardless-of-verdict` — the lever this spends
- `rule.always.raise-a-blocker-a-taken-cannot-close` — the counter-bound that refuses option A
- `rule.always.get-a-second-opinion-before-foreman` — the peer read that found the lever
- `contract.reviewer-output` — the contract, and its own incidental-match caution
- `F21` — the peer case: a framework-owned defect this behavior cannot close from within

---

## .the verdict, once ruled — (open; taken as **B** for this stone)

🟡 `open` carries the set's one sense: **open to the council's reversal**, never *nobody decided*.
