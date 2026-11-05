# F14 — a stale modded view fails the boot and names `rhx init`

## .the fork

F8's clamp requires a stale view to fail loud "at boot or re-materialize". the bun `roles boot`
path writes no files today. at boot:

- **a — fail loud and name `rhx init`**; every render path re-materializes, so the next render
  heals it (taken)
- **b — heal it in place** (re-materialize), then boot; a heal it cannot do fails loud

## .taken, and why

a. boot stays read-only and fast, and F8 is met at both moments. the cost: an author who adds a mod
file runs a render before the next boot, and the onStop sweep names that render.

## .rework

clean. a heal can be added later, in front of the same assert.

## .confidence — 80%, and why it is short of 93

- the author loop (edit, boot, see) gains a step; how often an author meets it is unmeasured

## .risk

low — no credential, no prod write. the failure is loud and names its own fix.

## .where

- `3.3.1.blueprint.product.yield.md` — `assertRoleModdedViewFresh`, `getRoleModdedViewDrift`, the
  F8 clamp tests

## .verdict

ruled, taken (a) — director, 2026-11-04 15:45Z, on the commander's hand-off of the blueprint
review: it meets F8 at both moments, keeps boot read-only, and a heal can be added later.
