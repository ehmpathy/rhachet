# R8 — `roles cost --all` sweep intact

**status:** ✅ intact (read from code; not yet run)

`invokeRolesCost.ts` → `getAllRepoBootSpecCosts` → `getAllRepoBootSpecPaths` reaches
`.agent/repo=*/role=*/boot.yml`, `.behavior/*/boot.yml`, `.route/*/boot.yml`,
`src/domain.roles/*/boot.yml`. #553 touches none of it. it reports `.this` and ad-hoc specs over
budget — on demand only. R3 option B gives it a trigger (CI).
