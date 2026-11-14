# requirement: `.agent/repo=.mods` is a reserved slug — no supplier, no role, no scan

part of the [requirements inventory](./inventory.of=requirements._.md).

## .the requirement

- no scanner of `.agent/` reads a mod dir as a role: skills, inits, the role-dir lookup, briefs,
  keyracks, the linked-role scan, and the hook load each skip it
- `rhx init` tries no install of a `rhachet-roles-.mods` package
- the framework reads the mod dir only to render it (the view sync) and to cost it (`roles cost`);
  it arms no hook (case 22, amended 2026-11-09)

## .clamp

- `src/domain.operations/role/asRepoSlugKind.ts` — `.mods` is a reserved kind

## .proof

| tier | test | status |
|---|---|---|
| integration | `src/domain.operations/role/asRepoSlugKind.scanners.integration.test.ts` `[case1]` `[t0]`–`[t6]` | ✅ green 2026-11-07 |
| acceptance | `blackbox/cli/init.mods.acceptance.test.ts` `[case1]` (no install tried) | ✅ green 2026-11-07 |

status: proven

## .source

the vision of `.behavior/v2026_10_16.feat-role-edit-overlay` (usecase 11).
