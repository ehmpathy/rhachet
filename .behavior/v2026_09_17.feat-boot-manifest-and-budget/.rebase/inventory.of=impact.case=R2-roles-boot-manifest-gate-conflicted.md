# R2 — `roles boot --manifest` gate conflicted

**status:** ⚠️ conflicted

`src/domain.operations/invoke/bootRoleResources.ts` carries both halves: main's (`slugRepo`/`slugRole`
→ `getOneRoleBootContent`, stats block inline) and ours (`from` → `getOneBootSource` →
`genBootPayload` → `assertBootWithinBudget`). settle toward ours — the gate lives only there.

peers in the same seam, also unmerged: `invoke.ts`, `invoke.bun.entry.roles.ts`,
`invokeRolesBoot.integration.test.ts`, `roles.boot.acceptance.test.ts` (+ snap),
`getRoleBySpecifier.ts`, `assureUniqueRoles.ts`.

⚠️ after it settles, `roles boot` is gated but **no longer on any default trigger** (R3, R5), so it
guards a direct call and a `--manifest` hook — and only once R5 is fixed.
