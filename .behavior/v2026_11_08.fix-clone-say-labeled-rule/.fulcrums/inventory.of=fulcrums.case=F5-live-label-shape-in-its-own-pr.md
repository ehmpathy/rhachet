# F5 — the live proof of the label shape lands in its own pr

## .the fork

`enroll-impl-behavior-intent` (i005, point 1) notes that no test shows a real brain draws the
labeled rule. the stub modes and the unit fixture all copy the one string pasted in #655.

- **A** — a dedicated pr adds an on-demand realbrain cell that enrolls a named agent and asserts the
  band, the rule shape, and a `released` say (ehmpathy/rhachet#738)
- **B** — add that cell in this nano fix

## .taken, and why at the time

A. the wish's done-list is a clamp on the captured rows plus a pr green on ci. a realbrain cell is
on-demand, so ci never runs it, and it would not change what ci proves. the capture in #655 is the
measured evidence, quoted verbatim. the cure fails closed on every shape it does not parse: a
lead run under 20, a `─` inside the label, a labeled bottom rule. so an unmeasured shape withholds
the say and never writes over a box.

## .rework

clean — one new on-demand test file, plus a version note in the `isRuleRow` docblock.

## .risk

none — a test that runs only on demand. no credential in ci, no prod write.

## .confidence — 80%, and why it is not higher

a named agent's rule shape could differ across claude versions, and this fix would then meet a
shape it reads no rule, with the say withheld, which is the defect it set out to cure.

## .where

- `blackbox/cli/clone.screen-dogfood.realbrain.acceptance.test.ts` (the extant live cell beside it)
- `src/domain.operations/clone/screen/computeCloneInputState.ts` (`isRuleRow` docblock)
