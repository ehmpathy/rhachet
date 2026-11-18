# requirement: a clone of a modded role sees the mod — a notice, and a tag on each modded resource

part of the [requirements inventory](./inventory.of=requirements._.md).

## .the requirement

- a modded role's boot opens with `<mod of="<repo>/<role>[@pin] (installed <v>)">`, its counts
  (`N shadow, N add, N not`), a `[-] not <path>` line per not, and a `[~] shadow … drops the published
  <path>.min` line where a shadow drops a published minified form
- each shadow and each add carries `mod="shadow"` / `mod="add"` on its boot row, `say` or `ref` alike
- the same notice and tags reach the `boot.md` an enrolled clone reads
- a resource the mod leaves alone renders untagged

## .clamp

- `src/domain.operations/mods/asRoleModNoticeLines.ts` — the notice
- `src/domain.operations/boot/asRoleBootBody.ts` — the tags on each row

## .proof

| tier | test | status |
|---|---|---|
| unit | `src/domain.operations/mods/asRoleModNoticeLines.test.ts` | ✅ green |
| unit | `src/domain.operations/boot/asRoleBootBody.test.ts` | ✅ green |
| acceptance | `blackbox/cli/roles.mods.acceptance.test.ts` `[case1]` `[t0]` (boot.md), `[t1]` (cli boot) | ✅ green |
| integration | `blackbox/cli/roles.mods.subject.integration.test.ts` `[case1]` (ref rows tagged), `[case2]` (enroll at a subject) | ✅ green 2026-11-07 |

status: proven

## .source

the wish of `.behavior/v2026_10_16.feat-role-edit-overlay`, 2026-10-16: a clone must know its role is
modded.
