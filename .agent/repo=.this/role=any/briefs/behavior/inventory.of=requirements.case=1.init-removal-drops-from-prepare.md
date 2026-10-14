# requirement: `rhx init --roles -xyz` drops `xyz` from `prepare:rhachet` 🔴

part of the [requirements inventory](./inventory.of=requirements._.md). **critical.**

## .the requirement

after `rhx init --roles -xyz` (or its bare-sigil alias `rhx init -xyz`), the `prepare:rhachet` entry
in `package.json` no longer names `xyz`. every other role and flag in that entry survives untouched.

it holds in every form `rhx init` reads its `--roles` in — space (`--roles a xyz`), comma
(`--roles a,xyz`) and inline (`--roles=a,xyz`) — and the entry keeps the form it was written in.

so the next `npm install` / `pnpm install`, which runs `prepare` → `prepare:rhachet`, never re-links a
role the human removed.

## .why

`prepare:rhachet` is how a repo re-links its roles on every install, for every teammate and every
fresh clone. a removal that leaves it alone undoes itself at the next install — silently: the human
sees `xyz` gone, a teammate's install brings it back.

## .clamp — landed 2026-10-02

- `src/domain.operations/init/prep/asPrepareRhachetRolesDelta.ts` — drops each removed role from the
  `--roles` run (by slug, and by repo when both name one), appends additions, keeps every other token
- `src/domain.operations/init/prep/setPrepareRhachetRolesDelta.ts` — applies it to an extant
  `prepare:rhachet` entry; writes only on a change
- `src/contract/cli/invokeInit.ts` — every incremental `rhx init` with a removal calls it, `--prep` or
  not; under `--prep`, an incremental delta applies to the extant entry rather than overwrite it with
  the additions alone

before this, `invokeInit` wrote `prepare:rhachet` only under `--prep`, and in incremental mode wrote
the additions alone (`getRoleSlugsForFlags`), so a removal never reached the entry.

## .history — how the clamp was lost

`v2026_07_07.fix-rhx-init` (#418) shipped incremental `--roles +role/-role` and the bare-sigil alias.
its vision listed open question 6, *"should incremental interact with `--keys` / `--hooks` / `--prep`?"*,
and marked it answered from code: *"they compose with whatever set the incremental step produces"*.
the execution then recorded *"`--keys`/`--prep` narrows to `adds` in incremental mode"* as
*"⚠️ by design"*. the requirement was never written as one, so no test held it.

## .proof

| tier | test | status |
|---|---|---|
| unit | `src/domain.operations/init/prep/asPrepareRhachetRolesDelta.test.ts` (15 cases, the comma and inline forms among them) | ✅ green 2026-10-02 |
| integration | `src/domain.operations/init/prep/setPrepareRhachetRolesDelta.integration.test.ts` ([case1b] is the comma form) | ✅ green 2026-10-04 |
| acceptance | `blackbox/cli/init.incremental.acceptance.test.ts` [case3.1] — `init --roles -architect` | ✅ green 2026-10-04 |
| acceptance | `blackbox/cli/rhx.acceptance.test.ts` [t2.1] — the bare `rhx init -ergonomist` | ✅ green 2026-10-04 |

all four are green, so the entry is `proven`. the two acceptance rows ran on 2026-10-04 via
`rhx git.repo.test --what acceptance --mode apply` with the test keyrack unlocked (21 suites, 1031
tests green), against a fresh `npm run build`.

## .source

the wisher, 2026-10-02 (`v2026_09_26.fix-config-blend` seed 27): *"we MUST ensure that `rhx init -xyz`
removes the role xyz from the `prepare:rhachet` list … thats a critical requirement"*.
