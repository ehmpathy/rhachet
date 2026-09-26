# F16 — treestruct connectors follow ancestry, not uniformity

## .fork

a multi-line comment hangs below a tree node. does its continuation line carry `│`?

| branch | rule |
|---|---|
| a. uniformity | every continuation carries `│` |
| **b. ancestry** | `│` iff an ancestor has a further peer below — the rule that picks `├──` over `└──` |

## .verdict — ACCEPTED at i005 (0 blockers, 0 nitpicks), after a `[REFUTE]` at i004 r10

## .grounds

- a `│` is a claim that a branch continues. under a `└──`, no ancestor continues, so a `│` there
  states a falsehood about the tree.
- measured on all seven cited sites: 7 of 7 correct under (b), 3 of 7 under (a).
- the comment bodies align at one column either way; only the connector varies.

## .where

- every fenced tree in `3.3.1.blueprint.product.yield.md`
