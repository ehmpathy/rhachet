# F27 — a transformer caselist keeps the data-driven `test()` form

## .the fork

a 5.3 reviewer (r7, nitpick 1) asks the new table-driven transformer suites to wrap each row in
`given` / `when` / `then`. keep the data-driven `TEST_CASES.map(c => test(c.description, …))`
form, or rewrite each row into bdd frames.

## .taken, and why

keep the data-driven form.

- `rule.prefer.data-driven` (mechanic) names this exact shape for transformer unit tests, and its
  own example is `TEST_CASES.map(thisCase => test(thisCase.description, …))`
- `rule.require.given-when-then` scopes bdd frames as *recommended* for unit tests; it is
  *required* for integration tests, and every integration suite in this pr uses them
- the form is the repo's extant convention: some thirty extant unit suites outside this pr use it
  (`asTreeBranchLines`, `isPathOutsideDir`, `asRolesUpsertedByDelta`, `isBrainClaudeCode`, …)
- a pure transformer has no setup and one act per row; a `given` + `when` per row would restate
  the row's description three times and add no context

## .rework

clean — a mechanical wrap of each map, if the council prefers bdd frames.

## .confidence

88% — the two rules overlap at the unit grain, and a council may read `given-when-then` as the
stronger of the two.

## .where

the ten suites r7 names, e.g. `src/domain.operations/role/asRepoSlugKind.test.ts`

## .verdict

open
