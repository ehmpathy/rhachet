# F33 — a transformer caselist keeps its data-driven shape

## .the fork

5.3 i001 r007 nitpick.1: fifteen new unit suites for pure transformers run `TEST_CASES.map((thisCase) => test(...))` under `describe`, not `given / when / then`.

- **a** — reshape each into given/when/then triples
- **b** — keep the caselist shape

## .taken

b. `rule.prefer.data-driven` (mechanic) names this exact shape as the preferred form for unit tests of transformers, with the same `TEST_CASES` / `describe` / `test` example. `rule.require.given-when-then` marks given/when/then as expected for unit tests and required for integration. each suite here is a pure transformer's caselist, and each suite that orchestrates (the tick, the handlers, the render) is given/when/then.

## .rework

clean: a reshape of fifteen small suites, with no assert change.

## .confidence — 85%, why not higher

the two rules overlap at unit grain, and neither names which one wins there.

## .where

- the fifteen suites r007 nitpick.1 lists, e.g. `isRenewExpiryAdvanced.test.ts`

## .verdict

open — to the commander at the pr.
