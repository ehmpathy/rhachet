# F001 — createTestHomeWithSshKey allocates at factory time

## .the concern

two reviewers (arch-opport-decomposition nitpick.2, arch-hazards-behavior nitpick.2) ask that
`createTestHomeWithSshKey` allocate its temp home inside `setup()`, not when the factory is called.

## .why it is fine to continue

- its callers read `testHome.path` at **describe time**, before any hook runs — e.g.
  `setKeyrackKeyHost.integration.test.ts:44`, `fillKeyrackKeys.integration.test.ts:152`,
  `envAllHostingStrategies.integration.test.ts:76` each do `const root = join(testHome.path, …)`
  inside a `given`. a path that exists only after `setup()` breaks every one of them
- the pre-change shape computed the path at factory time too (a deterministic
  `/tmp/rhachet-test/{name}`); only the mkdir moved, and genTempDir makes the dir in the same act
  that names it, so path and dir cannot be split without a mutable holder
- the cost of collection-time allocation is one empty dir per file that jest loads, which the
  run's own teardown reclaims — the exact guarantee this behavior ships

## .what would change the call

a refactor of the callers to read the path lazily (inside `then`/`beforeAll`) — out of this
behavior's bound, and a churn across ~30 call sites for no change in what is reclaimed.

## .rework

clean — one factory; but the callers' describe-time reads would each need a lazy rewrite.

## .verdict

settled by the driver, by reason: the dir is reclaimed either way, and a setup-time allocation
breaks every describe-time caller named above. factory-time allocation holds. no human call owed.
