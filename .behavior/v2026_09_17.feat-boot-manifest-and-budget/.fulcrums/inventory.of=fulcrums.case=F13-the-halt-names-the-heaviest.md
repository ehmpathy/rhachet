# F13 — the halt's per-resource breakdown: invented here, and never itemized

**rework: clean · status: 🔴 REFUTED by the wisher · confidence: n/a (the guess was 70%, and lost)**

🔴 **the wish never asked for this.** it is the vision's own invention, and it became a bdd `then`
in two demos, a cell verdict in the dimensions, and **a premise `F4`'s guess rests on** — all
without a row.

---

## 🔴 .the refutation — 2026-09-18, the wisher, at the approval gate

> it shouldn't say which docs to omit. it should just say omit some. and it should recommend
> catalogization, condensation, reference, and elimination as good strategies to guide the fix on
> budget exceeded.

⇒ **the itemization paid off exactly as it was supposed to.** this fulcrum existed to put an
un-asked-for feature in front of a reviewer; the reviewer read it and struck it. a version of this
vision without the `F13` row would have shipped the breakdown as a premise.

### 🔴 .the argument, and it is sharper than "the wish did not ask"

| the halt names… | what it asserts it knows |
|---|---|
| **which doc to demote** | 🔴 that doc's **value** — that this one is the right one to give up |
| **that some must go**, plus how | only the payload's **cost**, and the mechanisms available |

**the tool knows cost. the author knows value.** a remedy that names a file claims knowledge the
gate does not have and cannot get — a 2,021-token brief may be the one document the whole role
rests on, and a 300-token one may be dead weight. ⇒ **to name the heaviest is to advise by the one
axis the tool can see, and that axis is not the one the decision turns on.**

🟡 **and this fulcrum had already found the symptom, with no name for the cause.** the whack-a-mole
note below observes that a trim of the top brief *leaves* the heaviest list, so the next halt names
three smaller files — an author who follows the advice literally walks a staircase, downward.
**that loop is what advice-by-cost looks like from the inside.** I recorded it as a caveat and kept
the feature; the right read was that it refuted the feature.

### .what replaces it — four strategies, in the wisher's order

the halt names **that** the payload must shrink, and offers the ladder rather than a target:

| # | strategy | what it does | what survives |
|---|---|---|---|
| 1 | **catalogization** | replace a set of briefs with one catalog that indexes them | all of it, restructured |
| 2 | **condensation** | author a `.md.min` beside the `.md` — the renderer already prefers it | all of it, compressed |
| 3 | **reference** | move a brief `say` → `ref` — the path boots, the body does not | all of it, not resident |
| 4 | **elimination** | delete it — it did not earn its place | none of it |

🔴 **the order is a ladder of loss, and that is why it is worth a print in order.** 1 and 2 cost
the reader naught; 3 costs a dereference; 4 costs the document. an author who reads them top-down
reaches for the cheapest remedy first, which is the pit of success. **a heaviest-list, by contrast,
sorts by cost and so pushes toward 3 and 4 with no hint that 1 and 2 exist.**

🟡 note **2 and 3 were already in the wish's own three remedies** (`point say at a .min`,
`move say → ref`). so the wisher's set **adds catalogization and elimination** and drops the
per-file targets — the remedy block grows in kinds while it shrinks in specificity.

### .what it un-blocks

| the constraint | status |
|---|---|
| `F4`'s doubt — *"the token count needs a per-resource breakdown"* | ✅ **MOOT.** no per-resource loop is owed. `F4` is already re-decided to `repo introspect`, and the guard needs one total |
| `case=2` / `case=7` `then`s that assert the heaviest list, in order | 🔴 **must be rewritten** to assert the four strategies and the absence of a named target |
| the `dimensions` cell verdict for the human's halt | 🔴 **must be re-verdicted** |

---

## .what was invented

the wish's requirement 3 says the halt **names the remedies**, and names three:

> move `say` → `ref` · point `say` at a `.min` variant · raise the declared budget deliberately

the vision added a **second block** the wish does not mention:

```
   ├─ the 3 heaviest say resources
   │  ├─ 2,021  briefs/howto.write.skills-stdout.md
   │  ├─ 1,900  briefs/rule.always.catch-dreams.md
   │  └─ 1,204  briefs/philosophy.entoolment.md
```

**verified absent from the wish:** a case-insensitive grep of `0.wish.md` for
`heavi|breakdown|per-resource|which doc|what to trim` returns **no match**.

---

## 🔴 .why an un-itemized invention is the expensive kind

it did not stay a narrative flourish. it propagated to five artifacts, two of them **contracts**:

| where | what it became |
|---|---|
| `case=2.md:69` | `then the halt names the heaviest say resources, with their token cost` — a **bdd assertion** |
| `case=7.md:162` | `then stderr names the 3 heaviest say resources, with each one's token cost` — a second one |
| `dimensions.md:152` | part of the human actor's demoed cell verdict |
| `yield.md:375, 382` | an edge-case remedy, and *"the pit-of-success move that matters most"* |
| 🔴 **`F4.md:38`** | **a constraint on F4's guess** — *"needs a per-resource breakdown for the halt's '3 heaviest' list"* |

⇒ **that last row is the defect's sharpest form.** a fulcrum's 96%-confidence guess about gate
position now cites, as a requirement, a feature nobody decided to build. **an un-itemized call
became a premise.**

---

## .the fork, stated fairly

| option | the cost |
|---|---|
| **name the N heaviest `say` resources, with cost** (taken) | a per-resource breakdown must survive to the gate — which is what constrains `F4` |
| name no resources; the remedies alone | the wish's literal requirement 3. the author must go measure to know **what** to trim |
| name every `say` resource, sorted | the halt grows without bound — a 103-say spec prints 103 lines |
| name the fewest resources whose removal would **fit** the budget | the most useful answer, and it needs a subset-sum the halt has no business to solve |

---

## .the guess taken, and why

**keep the breakdown. it is the difference between a halt and a useful halt.**

| the argument | |
|---|---|
| `rule.require.errors-name-the-fix` demands the **concrete next move** | *"you are 2,240 over"* makes the author go measure. *"these three cost 3,100"* makes them fix it |
| the data is already in hand | the gate must sum per-resource chars to total them at all — the breakdown is a **sort of a list it already holds**, not a second pass |
| it bounds the output | a fixed N keeps the halt one screen regardless of spec size |

🟡 **why N = 3 is the weakest part of the guess.** it is an unargued constant. the honest defence is
Miller's 7±2 read downward — three is scannable and a trim rarely needs more than one. but no
measurement backs it, and 5 would be equally defensible.

---

## 🔴 .the part F12 breaks — the sort key is the quantity F12 refuted

the list is *"the heaviest **say** resources"*, sorted by say-content chars. under `F12` that is
**36.5%** of the emitted payload.

| the spec | what the list shows | what actually occupies |
|---|---|---|
| 8 dense `say` briefs | ✅ the order is right | the same order |
| 🔴 **271 `ref` lines + 8 small `say` briefs** | the 3 tiny say briefs | **the ref lines, which the list cannot name at all** |

⇒ **a ref-heavy spec's halt names three resources that are not its problem.** and it is not a rare
shape — `repo=.this/role=any` is exactly it (8 say, 271 ref).

🔴 **and it compounds the illusory-remedy defect.** the author takes remedy 1 (say → ref), the moved
brief **leaves the heaviest list entirely**, and the next halt names three smaller files — so the
list reports steady progress while occupancy rose.

| F12 settles on | what this list must become |
|---|---|
| the full rendered payload | *"the 3 heaviest **resources**"* — ref lines and `<also>` members eligible |
| say content alone (status quo) | the list is honest about a number that is not the payload |

⇒ **so this fulcrum cannot be closed before F12.** its sort key is F12's output.

---

## 🟡 .the second break, from F1 — the per-file numbers are the least accurate ones we print

`F1` measured per-file density at **2.96 → 4.75** chars/token (p05 3.59, p50 3.98). a single
file's token cost at a fixed divisor therefore carries the **full ±26% tail**, where the aggregate
carries −0.8%.

⇒ so the halt would print three numbers, each individually the worst-calibrated figure in the
system, and an author would trim against them.

🟡 **the order survives, and that is what redeems it.** a constant divisor is monotonic, so
`chars` order = `tokens` order — the *sort* is exact even where each *magnitude* is off. ⇒ the fix
is to drop the cost column and keep the order, never to drop the list.

### 🔴 .the guess is now the ASSERTED shape — corrected at `review.self r5 / i005`

this section read *"if the numbers prove indefensible, the fix is …"* — a conditional — while
`case=2` and `case=7` each asserted a bdd `then` that **named a per-file token cost**. a peer lane
refused the gap:

> *"the asserted `then` pins behavior the vision has separately shown to be [defective] and plans
> to remove … presented as settled while its data is known-wrong."*

⇒ 🔴 **a fulcrum's guess and a case file's `then` must be the SAME shape.** the numbers were already
proven indefensible *in this file*, so the conditional was spent and the `then`s pinned the branch
this fulcrum had already rejected. both `then`s now read *"the 3 heaviest say resources, IN ORDER,
with no per-file cost"*, and both rendered halt blocks drop the column.

🟡 **the second live defect is untouched and stays disclosed:** under `F12` a ref-heavy spec's halt
names three resources that are not its problem. that one is a numerator defect, not a calibration
one, so no change of shape repairs it.

---

## .the confidence — 70%

| confident | not confident |
|---|---|
| a breakdown belongs in the halt | that **3** is the right N |
| the sort must follow F12's quantity | whether to print per-file costs at all, given the ±26% tail |
| it is owed a row (this file) | whether a halt this verbose serves an author mid-trim, or buries the one line they need |

🔴 **the 30% is ENGINEERING doubt, and that is a correction made at `review.self r4`.** the third
row once read *"whether the wisher wants a feature they did not ask for"* — an escalation, and an
unwarranted one: `0.wish.md:115-120` delegates **"the halt's rendered shape"** verbatim, and a
per-resource breakdown is exactly that.

⇒ so *"the wish did not ask for this"* remains the reason this fulcrum EXISTS — an inferred
requirement owes a row — and it is **not** a reason to hand the decision upward. the two live
doubts are the ones above: the sort key F12 refuted, and the ±26% per-file tail.

---

## .the rework cost — why clean

one halt template, its snapshots, and a per-resource sort the gate already has the data for. no
contract, no persisted value. 🟡 **but it is clean only while F4 is open** — F4's guess already
cites it, so to drop the breakdown now re-opens F4.

---

## .where

- `0.wish.md` requirement 3 — the three remedies, and no breakdown
- `1.vision.experience.case=2.over-budget-halts.md:25-28, 69` — the narrative block + the bdd `then`
- `1.vision.experience.case=7.the-authorship-loop.md:63, 162` — the second bdd `then`
- `1.vision.experience.dimensions.md:152` — the human actor's cell verdict
- `1.vision.yield.md:375, 382` — the edge-case row + the pit-of-success claim
- 🔴 `.fulcrums/inventory.of=fulcrums.case=F4-budget-gate-position.md:38` — where it became a premise
- `src/domain.operations/invoke/bootRoleResources.ts:127-146` — the per-resource loop the data comes from

## .the verdict

**keep the breakdown, sort it by F12's quantity. ANSWERED — mine, as rendered shape.**

⇒ `0.wish.md:115-120` delegates *"the halt's rendered shape"*, so an output block is my call even
though the wish never named it. **what the row records is that it was INFERRED** — so a reader who
asks *"where did requirement 3 grow a fourth part?"* finds the answer rather than an unexplained
feature.

🟡 **the two live defects stay open as engineering work**, not as questions: the sort key that F12
refuted, and whether to print per-file costs at all under a ±26% tail.
