# F10 — a guard op takes the `assert*` prefix

## .the fork

two guards throw on a bad state and return void: `assertBrainAuthUsageReadable` and
`assertBrainAuthLoginHasHuman`. a peer review (r4) graded `assert*` an unsanctioned verb.

- **A** — keep `assert*`, the repo's extant name for a void guard that throws
- **B** — rename to `is*` and return a boolean; each caller then throws
- **C** — rename to a `get*` that returns a verdict object

## .taken, why

**A**. the repo has 33 `export const assert*` ops (e.g. `assertKeyrackHostAddressed`,
`assertBootWithinBudget`, `assertUpgradeRoleSpecsUnfocused`, and `assertBrainAuthNotDead` in this
same domain). B moves each refusal's message, class and hint out to every caller, which forks the
one contract per refusal. C reads as a lookup, which a guard is not.

## .rework

clean: a rename of two files and their callers, if the mechanic rule's verb list is meant to bind
guards too.

## .confidence — 85%, why not higher

the mechanic rule lists no guard verb; whether its silence forbids `assert*` or never weighed it
is a call for the rule's owner.

## .where

- `src/domain.operations/brain/auth/account/assertBrainAuthUsageReadable.ts`
- `src/domain.operations/brain/auth/account/assertBrainAuthLoginHasHuman.ts`

## .verdict

open.
