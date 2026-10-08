# R1 — `repo introspect` gate intact

**status:** ✅ intact (read from code; not yet run)

`invokeRepoIntrospect.ts:96` → `assertRegistryWithinBudget` → `genBootPayload` → `assertBootWithinBudget`.
none of these files is in #553's diff or in the unmerged set. a published role over its
`budget.tokens` still fails `repo introspect`, so it cannot ship.

⚠️ it reaches only roles a package registers — never `repo=.this` (R3) and never an ad-hoc manifest.
verify with the scoped integration test after the conflicts settle:
`rhx git.repo.test --what integration --scope assertRegistryWithinBudget --mode apply`.
