# F50 — whether to bind a peer lane to the playtest guard, after a stdout defect shipped under it

- status     = **TAKEN**, 86%
- rework     = **clean** — one `peer:` block in one guard file, reversible in one edit
- raised     = 2026-09-25, from a wisher catch at stone 5.5

## .the fork, stated fairly

a human read the cli stdout this branch ships and caught a defect no review round had: a
`boot.md (default): <path> — N roles, M chars` census line, emitted flat, directly beside a tidy
`🧠 brain dir` treestruct. one surface, two registers, and the flat one read as stray noise.

then the question that opens this fulcrum: **why was it not caught in review?**

three mechanisms, each sufficient on its own:

| # | mechanism | scope |
|---|---|---|
| 1 | `5.5.playtest.guard` binds **`peer: []`** — six self lenses, zero peer lanes | the guard |
| 2 | the `has-fixed-all-gaps` lens asks whether the playtest revealed UX friction — and the clause was read as the playtest DOCUMENT's ux, never the product's | the rubric |
| 3 | the shape was under snapshot coverage from its first capture, so every later round read it as *covered* | general, cross-repo |

⚠️ and a fourth fact frames all three: **`rule.require.treestruct-output` exists** under
`ehmpathy/ergonomist` and **no lane on this route was ever bound to it.** the rule that names the
defect was in the tree the whole time, unreached.

so the fork: **bind a peer lane to `5.5.playtest.guard` now, or record the gap and defer the fix
to the template that owns it?**

## .taken, and why at the time

**defer — do not bind a lane at 5.5, on this arrival.** three reasons, in weight order:

1. 🔴 **the guard is a TEMPLATE, not this route's authorship.** its own header says so:
   `provenance.uri = node_modules/rhachet-roles-bhuild/…/templates/5.5.playtest.guard`. so a
   `peer:` block added here repairs **one route** and leaves every future playtest in every repo
   with the identical gap. the durable home is one repo away.
2. **the defect it would catch is already repaired.** the census line is gone from every prod
   surface, the report renders as one treestruct, and the acceptance tier pins the new shape. a
   lane bound now would grade an artifact that no longer holds the defect — real cost, no yield.
3. **the moment is the worst available.** 5.5 is the last stone; it is arrived and halted on human
   approval, after six self reviews and a full byhand run. a guard edit re-opens the review ladder
   at the final gate, and `rule.forbid.hand-run-reviews` rightly leaves no cheaper path.

## 🔴 .the cost this take accepts

**the next playtest, in this repo or any other, has the same hole.** that is the honest price, and
it is not hypothetical — mechanism 1 is structural and mechanism 2 is a clause that reads the wrong
way round, so both recur by default.

⇒ the deferral is only defensible because the durable half is **caught**, not merely noticed:

- `dreams/v2026_09_25.reseed.the-playtest-guard-binds-no-peer-lane.md` — bind an ergonomics lane
  to the `5.5.playtest.guard` template, and sharpen `has-fixed-all-gaps` so its friction clause
  names the **product's** surface rather than the document's
- `dreams/v2026_09_25.reseed.a-snapshot-defends-an-output-shape-nobody-reviewed.md` — mechanism 3,
  which is a test practice and belongs under `ehmpathy/mechanic`

## .why 86% and not higher

the deferral rests on *"the defect is already repaired"*, and that is a claim about **one** defect.
a peer ergonomics lane at 5.5 would have graded the **whole** shipped surface, not this one line —
so what the deferral actually forgoes is unknown in size, and a number cannot be put on it from
inside the route. the wisher may reasonably rule that the last stone is exactly where a product
surface deserves a lane, whatever it costs to re-open.

## .where it lands

- `.behavior/v2026_09_22.feat-boot-briefs-into-claude-md/5.5.playtest.guard` — **unchanged**, which
  is the decision
- `dreams/v2026_09_25.reseed.the-playtest-guard-binds-no-peer-lane.md`
- `dreams/v2026_09_25.reseed.a-snapshot-defends-an-output-shape-nobody-reviewed.md`

## .see also

- `rule.always.spend-own-levers-before-escalation` — the guard IS a driver lever, which is why the
  deferral owes this record rather than silence
- `rule.forbid.hand-run-reviews` — why no cheap substitute for a bound lane exists
- `rule.always.scope-onetime-lessons-to-the-behavior` — why both halves reseed rather than land here
- `rule.require.treestruct-output` (ehmpathy/ergonomist) — the unreached rule
