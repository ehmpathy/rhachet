# F12 — a mod uses its role's boot.yml mode

## .the fork

a role's boot.yml is simple (top-level `briefs`/`skills`) or subject (`always` + `subject.*`); some
roles have none. when the mod and its role differ in mode:

- **a — the mod must use the role's mode**; a mismatch is refused, and a role with no boot.yml takes
  a simple-mode mod (taken)
- **b — either mode**; a simple-mode side is read as an `always:` section before the merge
- **c — the mod is always subject mode**

## .taken, and why

a. the vision says the mod is "the role's schema", and one mode per merge keeps `computeBootPlan`'s
first-say-wins rule as is. b reads friendlier, but a simple spec's absent `say` means "say all",
which has no faithful `always:` form.

## .rework

clean. a later widen to b is additive: it turns a refusal into an accepted shape.

## .confidence — 85%, and why it is short of 93

- no extant mod exists to test the mismatch against; the one candidate (nheuron's learner) has not
  been read for its role's mode

## .risk

low — no credential, no prod write. a wrong call refuses a mod that could have merged, loud, with
the fix named.

## .where

- `3.3.1.blueprint.product.yield.md` — `parseRoleModBootYaml`, the usecase 11 refusals

## .verdict

ruled, taken (a) — director, 2026-11-04 15:45Z, on the commander's hand-off of the blueprint
review: one mode per merge keeps first-say-wins; a later widen to (b) is additive.
