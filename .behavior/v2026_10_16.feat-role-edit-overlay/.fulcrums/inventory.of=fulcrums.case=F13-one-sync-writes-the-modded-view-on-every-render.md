# F13 — one sync writes the modded view, on every render path

## .the fork

where the modded view (F8's per-file links) is written:

- **a — one orchestrator, `syncRoleModdedViews`**, called by each render path (enroll, init,
  upgrade, roles link); `execRoleLink` stays as is (taken)
- **b — inside `execRoleLink`**, plus a call from enroll, which never links today

## .taken, and why

a. enroll must re-materialize and does not link, so b needs the second call anyway. a keeps link
and mods apart, and leaves an unmodded role's path byte-identical.

## .rework

clean. the sync is one call per render path; a move into `execRoleLink` relocates the call.

## .confidence — 85%, and why it is short of 93

- a fifth render path, added later, must remember the call; no type enforces it

## .risk

low — no credential, no prod write. a render path that omits the call leaves a stale view, which
F8's clamp (F14) fails loud at the next boot.

## .where

- `3.3.1.blueprint.product.yield.md` — `syncRoleModdedViews`, `syncBootsForBrainDirs`,
  `invokeEnroll`, `invokeInit`, `invokeRolesLink`

## .verdict

ruled, taken (a) — director, 2026-11-04 15:45Z, on the commander's hand-off of the blueprint
review: one `syncRoleModdedViews`, called by each render path; link and mods stay apart, and an
unmodded path stays byte-identical.
