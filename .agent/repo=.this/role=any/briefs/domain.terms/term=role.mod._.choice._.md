# domain.term: mod

term.chosen   = mod             # noun: the dir, and each file in it · adj form: modded (the role)
term.kind     = noun
term.boundary = role            # a mod is always of one role
term.synonyms.forbidden:
- edit
- patch
- override
- overlay

## .what

a **mod** is a change a repo makes to a role it consumes, with no release of the role's package. it
lives at `.agent/repo=.mods/role=<role>/`: a `boot.yml` with `of: repo/role[@version]`, and the
files it ships. a role a mod is over is **modded**; its role dir then holds the **modded view**, a
dir of per-file links that every reader of the role dir sees.

a mod makes three moves, each by role-relative path: a **shadow** (a file at a held path), an
**add** (a file at an unheld path that a `say` or `ref` names), and a **not** (a glob that drops
held files — the extant boot `not`, reused).

## .refs

- src/domain.objects/RoleModSpec.ts · RoleModTarget.ts · RoleModPlan.ts · RoleModdedViewRecord.ts
- src/domain.operations/mods/computeRoleModPlan.ts
- src/domain.operations/mods/syncRoleModdedViews.ts
- .agent/repo=.this/role=user/briefs/roles/howto.mod-a-role.md

## .reason

- `term=role.mod._.choice.reason.md`
