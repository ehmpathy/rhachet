# F12 — what counts as PAYLOAD: the gate sees 36% of what the boot emits

**rework: 🔴 dirty · status: 🔴 ANSWERED — the disclosure was made, and the wisher ACTED on it · confidence: 100%**

## 🔴 .SETTLED 2026-09-18 — the FULL EMITTED PAYLOAD, via requirement 7

**the disclosure this fulcrum owed upward was made, and the wisher's response was to make accuracy a
requirement** rather than accept the guess. `0.wish.md` requirement **7** now reads: *the counter is
accurate — real tokens, over the full emitted payload* (seed **S3**).

⇒ so the guess below — *"gate the full rendered payload"* — is **confirmed**, and it is no longer
mine to defend. and `F1`'s divisor question closes in the same move: **requirement 7 repairs the
numerator and the denominator together**, rather than in F12-then-F1 order.

### 🔴 the full arithmetic, measured live 2026-09-18

the wisher asked *why is the tokenizer so wrong*. **the sharpest answer is that there is no
tokenizer** — and the error decomposes exactly:

| # | the defect | factor |
|---|---|---|
| 1 | **this fulcrum** — a scope error. 16,427 of 44,666 emitted chars are summed | **2.72x** |
| 2 | **`F1`** — the divisor. this payload's true density is **3.31** chars/token, not 4.0 | **1.21x** |

`2.72 × 1.21 = 3.29`, and end to end: the boot reports **4,107 tokens** for **13,494** real ones. ✅

🟡 **the earlier figure here read `2.74x` against 44,982 chars.** the live re-measurement gives
44,666 — the tokenizer's own char count over the captured payload, which excludes an artifact the
capture appended — so the factor is **2.72x**. the claim is unchanged; the digit is now one a single
instrument produced end to end.

### 🟡 what stays true, and what stops to matter

| the result | after requirement 7 |
|---|---|
| the halt's first remedy (say → ref) converts counted payload into **uncounted** payload | 🔴 **resolved.** every emitted byte is counted, so a say→ref move now reduces the gated number **by exactly what it removes from context** |
| `chars` in `<stats>` is the wrong quantity, and requirement 4 forbids a change to it | 🟡 **still live.** the guess stands: show the corrected number **only when a `budget` is declared** |
| a `budget: 0` cannot be met, because chrome alone is nonzero (`F14`) | 🔴 **confirmed and sharpened** — chrome is now explicitly in scope, so `0` is unmeetable by construction |

---

🟡 **`dirty` AND `[answered]` is not a contradiction** — `rework` grades how expensive a reversal
is; the status grades **who decides**. the two are independent axes, and this fulcrum is the proof.
re-graded from `needs the wisher` at `review.self r4`; see `.who decides`.

🔴 **raised at `review.self r3`, from a challenge to the yield's assumption 1.** it is the largest
issue the vision review found, and it **subsumes `F1`**: the divisor debate is second-order beside
it.

---

## 🔴 .the measurement

two commands, on the spec that boots into every session in this repo:

```
$ npx rhachet roles boot --repo .this --role any | head -13
  ├── chars = 16427
  └── tokens ≈ 4107 ($0.01 at $3/mil)

$ npx rhachet roles boot --repo .this --role any | wc -c
44982
```

| quantity | value |
|---|---|
| reported `chars` — **the number a budget would gate** | **16,427** |
| **actually emitted payload** | **44,982** |
| uncounted | **28,555 chars** |
| 🔴 **the gate sees** | **36.5%** of what it emits |
| undercount factor | **2.74x** |

⇒ derived, in the unit the budget uses: reported ≈ **4,107 tokens**; the true payload at the
measured corpus divisor (3.969, per `F1`) ≈ **11,300 tokens**.

> 🔴 **a `budget: { tokens: 5_000 }` on this spec PASSES at 4,107 while it occupies ~11,300 — more
> than 2x its own declared cap.**

---

## .what the gate omits, and why

`bootRoleResources.ts:126-146`, with the code's own comment:

```ts
// calculate stats (only count chars for "say" resources, which consume tokens)
let totalChars = 0;
if (readmeFile) { … totalChars += content.length; }          // readme content
for (const ref of bootPlan.briefs.say) { … }                 // say brief content
for (const filepath of bootPlan.skills.say) { … }            // say skill docblocks
```

**four classes of real, emitted payload are absent from that sum:**

| omitted | why it is real payload |
|---|---|
| 🔴 every `<brief.ref path="…"/>` line | emitted to stdout, resident in context. **271 of them** in this spec |
| every `<skill.ref path="…"/>` line | the same |
| the whole **`<also>`** block | its members are in `relevantFiles` (`:111-112`) and in **no** char sum |
| the **XML chrome** — `<readme path="…">`, `</brief.say>`, the `<stats>` block, blank lines | every byte of it occupies context |

🟡 the code's comment says *"only count chars for say resources, **which consume tokens**"* — the
parenthetical is the defect. **a ref line consumes tokens too.** it is cheaper than the file it
points at, and it is not free.

---

## 🔴 .the consequence that matters most — the halt's FIRST remedy is nearly illusory

`case=2`'s remedy list opens with **"move a `say` entry to `ref`"**. trace what that does:

| effect | on the gated number | on actual context occupancy |
|---|---|---|
| the file's content leaves `totalChars` | 🔴 **a large drop** | — |
| a `<brief.ref path="…"/>` line is added | **no change — it is uncounted** | 🔴 **a real increase** |

⇒ **so the recommended remedy converts counted payload into UNCOUNTED payload.** the author passes
the gate, the number falls, and the context occupancy falls by far less than the number suggests.

🔴 **that is the silent pass requirement 2 exists to forbid — and the halt itself recommends the
move that produces it.**

🟡 this supersedes the nitpick `review.self r2` filed against `F6` (that a say→ref move leaves the
`files` count unmoved, so the edit looks ineffective). **the truth is the opposite and worse:** the
edit looks *more* effective than it is.

### 🔴 .the reach is FIVE demos, not one — swept at `review.self r4`

this fulcrum was found by a challenge to `case=2`, and `case=2` was the only cell first patched.
**every demo that carries a budget relates to it, and they do not all relate the same way** — two
break under it, one corroborates it, one constrains it:

| cell | what it claims | what F12 does to it |
|---|---|---|
| `case=2` — the halt | *"move a say entry to ref"* | the remedy **overstates its effect**. the author is at least engaged, and can argue |
| 🔴 **`case=3`** — the manifest | *"budgeted **by construction**"* | 🔴 **falsifies the feature's whole case over the hook** — and the before/after convicts the hook on **occupancy** while it acquits the manifest on **say content**. a unit switch |
| 🔴 **`case=1`** — the receipt | `84% used`, read in half a second | 🔴 **a false reassurance believed on sight.** no halt fires, and the cell is **happy × critipath** — the least-scrutinized grade |
| 🔴 **`case=6`** — subject-scoped | *"the budget caps **what is actually emitted into context**"* | 🔴 **this fulcrum's best CORROBORATION.** it argued F12's principle a round before F12 was measured — and its `[t3]` asserts `then the cap applies to … + the <also> section`, **the only bdd `then` in the vision that names an omitted class by name** |
| 🔴 **`case=5`** — no budget declared | `[t0]` pins `tokens ≈ 56818` verbatim; `[t3]` re-runs every extant snapshot | 🔴 **this fulcrum's CONSTRAINT.** `chars` is the corrected quantity, so a **global** fix changes a pinned line and `[t3]` fails ⇒ **the budget-conditional shape is the only one this cell permits**, and `[t3]` is the gate that enforces it |

⇒ 🔴 **`case=3` is the sharpest of the four and was found last.** *"budgeted by construction"* is
the sentence that justifies `--manifest` over the hand-written hook — so under the extant sum, the
feature's own argument is stated in a unit the gate does not measure.

🟡 **and this strengthens the guess below rather than complicates it.** the case for a correct
numerator does not rest on the halt: it is owed by a receipt an author trusts without thought
(`case=1`), by the claim the feature is sold on (`case=3`), and by a bdd `then` already written
against it (`case=6`). **all four cells become honest under one fix.**

🔴 **the sharpest fact in this table: the vision had already ARGUED for the corrected quantity.**
`case=6`'s best-guess says the budget must cap *"what is actually emitted into context"* — F12's
exact claim, one round earlier — and `case=6` `[t3]` asserts the `<also>` block is within the cap.
⇒ **F12 is not a new requirement. it is the measurement that shows the extant counter does not meet
a requirement the vision had already written into a contract.**

🟡 **and the fix's SHAPE was pinned before it was needed.** `case=5` `[t0]` fixes the uncapped
`<stats>` line and `[t3]` re-runs every extant snapshot ⇒ the correction must be
**budget-conditional**, and a global one cannot ship by accident. **so the demos triangulate this
fulcrum:** `case=6` gives the principle, `case=5` gives the bound, `case=1` and `case=3` give the
harm, and `case=2` gives the measurement that found it.

| option | the cost |
|---|---|
| **count the emitted payload** — gate on the full rendered byte count | 🔴 the render must be computed **before** the gate, and requirement 2 says naught may be emitted. so the render is built to a buffer, measured, then flushed or discarded. a real restructure of `bootRoleResources` |
| count `say` content **plus the ref/also/chrome lines** the plan already knows | cheaper — the path strings and counts all sit in `bootPlan` before any output. an estimate, but a close one |
| keep the extant sum and **rename what it measures** (`budget.sayTokens`) | honest, and it caps the wrong quantity — the wish's *"context occupancy"* claim would be withdrawn |
| keep the extant sum and say naught | 🔴 the wish's central claim becomes false in silence |

---

## .the guess taken, and why

**option 1 — gate on the full rendered payload — with option 2 as the fallback if the restructure
proves unsafe.**

| the argument | |
|---|---|
| the wish's own words | it says the budget *"caps **context occupancy** — the ~46% figure — reliably, because a cached token occupies context exactly as an uncached one does."* 🔴 **a ref line occupies context by the identical logic.** option 1 is the only option that makes that sentence true |
| requirement 2 is satisfiable | the gate must precede the first emit (`F4`). a buffer-then-flush satisfies both: build the payload, measure, halt with naught emitted, or flush |
| it makes the remedy honest | under option 1, say→ref yields a real, proportionate drop, so the halt's first remedy means what it says |
| it subsumes `F1` | a ±26% divisor error is second-order beside a 2.74x omission. **repair the numerator before the denominator** |

⇒ and the render is already a sequence of `console.log` calls in one function, so a buffer is a
local change rather than an architectural one.

---

## 🔴 .who decides — settled at `review.self r4`

this fulcrum was graded `needs the wisher` for its whole life, on the grounds that **it re-prices
the wish's own open question.** that grade was wrong, and the sweep that found it split the fulcrum
into four parts:

| the part | who owns it | why |
|---|---|---|
| the **measurement** — 16,427 of 44,982 chars | 🔴 already mine | I ran it. it is a fact, never a question |
| the **quantity to gate** — say content vs the full render | 🔴 **delegated** | `0.wish.md:115-120`: *"**the counter you pick**"*. a counter is defined by what it counts |
| the **shape** — budget-conditional vs global | 🔴 **forced**, never chosen | requirement 4 forbids a global change, and `case=5` `[t3]` mechanically enforces it |
| the **unit's honest name** | 🔴 **explicitly requested** | the wish: *"whichever you take, state the error bar"* · *"name the unit honestly"* |

⇒ **every part is mine, forced, or already requested.** there is no residual choice for a wisher to
make, and the size of the find is not what decides ownership.

### 🟡 .what IS owed upward — a DISCLOSURE, never a question

the fulcrum contradicts a sentence the wish states as settled: *"it caps **context occupancy** — the
~46% figure — reliably."* under the extant counter that sentence is **false**.

but the wish names the remedy for exactly this case, in the same breath: the counter is mine, and
the error bar must be stated. ⇒ **I repair the counter and state what I found.**

🔴 **the distinction that had been collapsed:** *"a claim in the wish is now known false"* is a
**disclosure** — owed upward as prose, in the yield's `.what is awkward` and here. *"which of two
paths should we take"* is a **question** — owed upward as a decision. only the second is a
`[wisher]` item, and this is the first.

⚠️ **the disclosure is not optional.** a builder who ships the corrected counter and leaves that
sentence unamended has shipped a doc that lies about its own mechanism.

---

## .the confidence — 90%

| confident | not confident |
|---|---|
| the measurement (two commands, first-party, re-runnable) | whether the buffer-then-flush restructure is **safe** on the perf path (`F1` measured a live `under 250ms` assertion) |
| that ref lines, the `<also>` block, and the chrome are real context occupancy | whether option 2's estimate is close enough to make option 1's cost unnecessary |
| that the say→ref remedy is partly illusory under the extant sum | whether option 3 — keep the extant sum and **rename** it `budget.sayTokens` — is the better trade |

🟡 **the 10% is about the REMEDY, never the defect.** that the gate sees 36% of its payload is
measured and not in doubt.

🔴 **and the third row is an ENGINEERING doubt, not an escalation.** it once read *"whether the
wisher would rather re-scope the budget to say-content and rename it"* — but option 3 is itself *"the
counter you pick"*, so it is a trade I evaluate rather than a question I forward. the rewrite keeps
the doubt and drops the deferral.

---

## .the rework cost — why dirty

| what calibrates against this | the ripple |
|---|---|
| 🔴 **every `budget.tokens` value ever declared** | the same spec measures 4,107 or ~11,300 by which quantity is gated. a change re-prices all of them |
| the `<stats>` `chars` + `tokens` lines | snapshotted in `blackbox/cli/__snapshots__/` for **6 cases** |
| requirement 4's byte-identical claim | if `chars` changes for an uncapped boot, `case=5`'s snapshot moves — **and requirement 4 forbids exactly that** |
| the render's structure | option 1 buffers the output that today streams |

🔴 **the sharpest ripple is the requirement-4 collision.** requirement 4 demands a spec with no
`budget` render **byte-identical** to today. but `<stats>` prints `chars` and `tokens` — so to
correct the quantity is to change a line every extant boot prints. ⇒ **option 1 cannot satisfy
requirement 4 unless the corrected number is shown only when a `budget` is declared**, which is a
second rendered shape for one block.

---

## .where

- `src/domain.operations/invoke/bootRoleResources.ts:126-146` — the sum, and the *"which consume tokens"* comment
- `…:105-113` — `relevantFiles`, which **does** include ref and `<also>` members
- `…:148` — `Math.ceil(totalChars / 4)`, the estimate `F1` debates
- `…:164-186` — `printStats`, and the two lines requirement 4 pins
- `1.vision.yield.md`, `.the assumptions made` — assumptions 1 and 2, both corrected by this
- `1.vision.experience.case=2.over-budget-halts.md` — the remedy list this makes partly illusory
- `.fulcrums/inventory.of=fulcrums.case=F1-token-counter-choice.md` — the divisor question this subsumes
- `.fulcrums/inventory.of=fulcrums.case=F6-within-budget-loudness.md` — the say→ref nitpick this supersedes

## .the verdict

**gate the full rendered payload, budget-conditionally. ANSWERED — mine, with a disclosure owed
upward.**

⇒ the quantity is *"the counter you pick"*, delegated verbatim; the shape is forced by requirement 4
and enforced by `case=5` `[t3]`; the honest unit naming is explicitly requested. **what the wisher
receives is a statement that one of the wish's settled sentences is now false** — not a fork.

🟡 **it remains the largest find of the review and it subsumes `F1`.** repair the numerator before
the denominator.
