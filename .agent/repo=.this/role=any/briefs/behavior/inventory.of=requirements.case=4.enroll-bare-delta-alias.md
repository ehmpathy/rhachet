# requirement: `rhx enroll claude -driver` is an alias of `--roles -driver`

part of the [requirements inventory](./inventory.of=requirements._.md).

## .the requirement

a bare role delta after the brain — `rhx enroll claude -driver`, `rhx enroll claude +architect` —
reads as a `--roles` delta. `rhx enroll claude -driver` lands in the same actor, with the same
roles, as `rhx enroll claude --roles -driver`.

a brain's own short flags (`-c`, `-p`, …) still pass through to the brain.

## .why

it matches the grammar `rhx clone @x -driver` already uses, so a human types the same delta on
either verb.

## .clamp — landed 2026-10-02

- `src/domain.operations/enroll/isEnrollBareRoleDelta.ts` (and `asEnrollBareRoleDeltas.ts`, which
  splits the passthrough by it) — a passthrough token is a bare delta
  only when it wears a `+`/`-` sigil and its body names a **linked** role. so `-c`, `-p`, `--debug`
  and a typo like `-drivr` all stay with the brain
- `src/contract/cli/invokeEnroll.ts` — the bare deltas leave the passthrough and join `--roles` into
  one spec; a bare delta in the brain's slot (`rhx enroll -driver`) reads as a role, and the brain
  falls back to the default
- `src/domain.operations/roles/deltas/getPreprocessedRoleArgv.ts` — for enroll, a delta-shaped
  `-<word>` outside a `--roles` run is encoded before commander sees it, since `-r` is enroll's
  `--roles` alias and commander would read `-reviewer` as `-r eviewer`

before this, a bare `-driver` passed through to the brain (claude reads `-d` as `--debug`), and a
bare `-reviewer` overwrote the roles with `eviewer`.

⚠️ the space-form guard holds: `--roles -driver -reviewer` is still refused with the comma-form hint
(`getRolesSpaceFormCollision`). a bare delta **before** `--roles` joins it.

## .proof

| tier | test | status |
|---|---|---|
| unit | `src/domain.operations/enroll/asEnrollBareRoleDeltas.test.ts` and `isEnrollBareRoleDelta.test.ts` | ✅ green 2026-10-02 |
| unit | `src/domain.operations/roles/deltas/getPreprocessedRoleArgv.test.ts` [case10] | ✅ green 2026-10-02 |
| acceptance | `blackbox/cli/enroll.acceptance.test.ts` [case7b] — `-driver -c` drops driver, the brain gets `-c` and never `-driver`, and `--roles -driver` lands in the same actor | ✅ green 2026-10-04 |

all three are green, so the entry is `proven`. the alias is also named in `rhx enroll --help`,
asserted by `enroll.acceptance` (`rhx enroll --help` [case1], "the help names the bare-delta alias
of --roles")

## .source

the wisher, 2026-10-02 (`v2026_09_26.fix-config-blend` seed 26): *"and that `rhx enroll claude
-driver` is still an alias to `rhx enroll claude --roles -driver`?"* — decided as **make it an alias**.
