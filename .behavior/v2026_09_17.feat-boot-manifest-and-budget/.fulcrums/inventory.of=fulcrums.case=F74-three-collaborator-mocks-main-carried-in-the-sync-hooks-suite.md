# fulcrum F74 — the three collaborator mocks main carried in the sync-hooks suite

- **rework** = dirty
- **status** = `[author]` — OPEN, best-guessed **no**
- **confidence** = 80% — the cost of the real drive is estimated, not built
- **where** = `src/domain.operations/init/hooks/syncHooksForLinkedRoles.integration.test.ts:16-18`

## .the fork, stated fairly

the suite mocks three first-party collaborators — `getLinkedRolesWithHooks`,
`pruneOrphanedRoleHooksFromAllBrains`, `syncAllRoleHooksIntoEachBrainRepl` — so its cases can make
the orchestrator's error channels fault. `rule.forbid.integration.mocks` forbids a mock at
integration grain.

- **A** — drive all three real: fixture a linked role whose config fails to parse (the discovery
  fault) and an enrolled actor whose brain has no adapter (the sync fault), then drop the mocks
- **B** — keep the three mocks as `main` wrote them, and keep the one boundary this branch added
  (the actor read) driven real

## .taken — B, and why at the time

- the three `jest.mock` lines are **byte-identical to main**: `git show main:src/domain.operations/init/hooks/syncHooksForLinkedRoles.test.ts` carries them, with the same comment
- the suite moved from `.test.ts` to `.integration.test.ts` for one reason: F46 site 1 removed the
  mock of `getAllActorsOndisk` and drove the actor read against a real temp dir, a filesystem
  boundary a unit suite forbids. the move made the suite's tier honest about the boundary it
  crosses; it did not add a mock
- so the tier change surfaced a violation main already had; it did not create one. to fix it is
  to rewrite the error-path fixtures of a suite whose subject is hook sync, not the boot budget

## .rework, and why dirty

a real discovery fault needs a linked role package whose `getRoleRegistry` export throws, linked
under `.agent/` the way `roles link` lays it; a real sync fault needs an enrolled actor on a brain
slug no adapter claims, and each case must still assert the exact operator rows. the leaf faults
are each covered one layer down (`syncAllRoleHooksIntoEachBrainRepl.test.ts`), so A buys no new
behavior proof — it buys tier purity at the cost of a fixture rig.

## .confidence, and why it is not higher

the rig cost is estimated. a `roles link` fixture helper may already exist in `blackbox/.test/`
and lower it; if so, A becomes clean and this flips.

## .the verdict, once ruled

— awaited —

## .see also

- `F46` — site 1 (the actor read) is the change that moved this suite's tier
- `.dream/2026_09_25.two-unit-suites-mock-a-collaborator-a-seam-would-inject.md`
