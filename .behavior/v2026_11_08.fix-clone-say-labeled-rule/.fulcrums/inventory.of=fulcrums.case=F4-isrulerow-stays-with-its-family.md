# F4 — `isRuleRow` stays beside the locator predicates it ships with

## .the fork

`enroll-impl-arch-defects` (i004 nitpick.1) asks that `isRuleRow` move to `isRuleRow.ts` with its
own test, and that the `20` floor become a named constant.

- **A** — leave it in `computeCloneInputState.ts`, beside `isBlankRow` and `getInputBand`
- **B** — move `isRuleRow` alone to its own file

## .taken, and why at the time

A. `computeCloneInputState.ts` exports a family of locator predicates, and
`computeCloneInputContent.ts` imports them as a set (line 5). a move of one predicate alone splits
the family across two files and leaves its siblings behind. the clean cut is a decomposition of the
whole locator, which is beyond a nano fix. the regex is already a named module constant (`RULE_ROW`)
with a comment on its floor.

## .rework

clean — a later move is one new file, and two import lines change. no caller leans on where it
lives.

## .risk

none — a file location, no behavior, no credential, no prod write.

## .confidence — 80%, and why it is not higher

the reviewer's case is real: the docblock and the caselist grew in this change. a reader may prefer
the lone move now over a family decomposition that may not come.

## .where

- `src/domain.operations/clone/screen/computeCloneInputState.ts` (`isRuleRow`, `RULE_ROW`)
- `src/domain.operations/clone/screen/computeCloneInputContent.ts:5` (the import set)
