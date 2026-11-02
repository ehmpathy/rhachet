# F13 — the layout op stays one function, not a planner and an executor

## .the fork
- A: `setBrainDirSettingsLayoutWithinLock` decides and acts in one pass, with the arrow order written
  once per branch (grove present · grove absent)
- B: a pure `getAllArrowsOfLayout({ isGrovePresent })` returns the ordered plan; a thin executor walks
  it — table-testable, the order named once

## .taken = A, and why — a structure choice, with no work left undone
no defect sits behind B. what B would buy (an order clamp) A already has: the integration suite pins
each branch's effects in order ([case1]–[case10]). so there is no found work here to defer — only two
shapes, and A is the one that fits:

- two branches, five names, one order rule per branch (home side first to set, top first to remove)
- `rule.prefer.wet-over-dry` (mechanic): an abstraction earns its place at 3+ variants; a plan type
  with two rows of variance is the premature form it warns of
- B adds a type, a file, and an executor seam for no behavior change

## .what would flip it
a third branch — F12's B, or a box-specific arrow. at that point the plan has three rows and B pays
for itself; it would land in the pr that adds the third branch.

## .confidence = 80%, low because
F12 may add that third branch, if the wisher amends fix-config-blend case=4.

## .where
`src/domain.operations/actor/enrolled/setBrainDirSettingsLayout.ts`

## .verdict
owed — for the wisher at the close.
