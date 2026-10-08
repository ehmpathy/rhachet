# inventory.of=impact — what main's #553 does to this behavior

> main (#553, v1.48.0) moved the boot from **per-role `roles boot` SessionStart hooks** to a
> **rendered `boot.md` per brain dir**, written at `init` · `upgrade` · `roles link` · `enroll`.
> our gates were placed on the old trigger. this inventory says which survive the move.

## .the axes

- `case` — one gate, path, or premise this behavior depends on
- `status` — ✅ `intact` · ⚠️ `conflicted` (intact once the stash conflicts settle toward ours) · 🔴 `broken` · 🟡 `gap` (never covered, now exposed)

## .the index

| case | subject | status | why |
|---|---|---|---|
| R1 | `repo introspect` gate (`assertRegistryWithinBudget`) | ✅ intact | its call site (`invokeRepoIntrospect.ts`) is untouched by #553 and unconflicted |
| R2 | `roles boot --manifest` gate (`bootRoleResources`) | ⚠️ conflicted | main rewrote `bootRoleResources` around `getOneRoleBootContent`; ours around `genBootPayload`. settle toward ours |
| R3 | `repo=.this` budget detection | 🔴 broken | its only trigger was `roles boot --repo .this --role any` in SessionStart. #553 deleted every such hook; `boot.md` renders `.this` with no gate |
| R4 | every linked role's budget at session time | 🔴 broken | same cause as R3 — `setBrainDirBoot` renders via `getOneRoleBootContent`, which never measures, so no render reads `budget.tokens` |
| R5 | ad-hoc manifest delivered by a role hook | 🔴 broken | `getLinkedRolesWithHooks` drops every `rhachet roles boot …` onBoot hook (`isRolesBootCommand`), `--manifest` included — yet `boot.md` never renders a manifest |
| R6 | "one renderer" (wish req 1) | 🔴 broken | two renderers now: `getOneRoleBootContent` (main, feeds `boot.md`) and `genBootPayload` (ours, feeds the gates). the number a gate measures is not the bytes a session reads |
| R7 | the `framework-owned-hooks` corollary | 🔴 premise false | it says *"`roles boot` already fires once per role per session, and the gate belonged inside it."* after #553 it does not fire at all |
| R8 | `roles cost --all` sweep | ✅ intact | on-demand report, reaches `.agent/repo=*/role=*`, `.behavior/*`, `.route/*` specs; unaffected — but no trigger runs it |
| R9 | a cap on the **sum** in one `boot.md` | 🟡 gap | per-spec budgets never capped the concatenation; `boot.md` now IS the concatenation (this session: ~368k tokens resident) |

## .counts

9 cases · 2 intact · 1 conflicted · 5 broken · 1 gap

⚠️ **no ✅ row is test-verified yet.** 24 paths are still unmerged from the stash apply
(`git diff --name-only --diff-filter=U`); each status here is read from the code, not from a run.

## .gaps — owed and absent

- one renderer behind `boot.md` and every gate, with no block at render (R6)
- a memoized `.this` stop hook, declared by `repo=.this/role=any` (R3)
- a keep-rule for `--manifest` hooks (R5) — open, see `case=R5`

⇒ the wisher's calls on each idea: `inventory.of=impact.decisions.md`
