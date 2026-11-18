# F4 — the rule manifest lives in every actor's brain dir

## .the fork
- (a) one manifest per actor, beside `settings.of.repo.json`
- (b) one manifest for the repo
- (c) no manifest: the dispatcher discovers rules at each call

## .taken
(a).

## .why
- the rule set derives from `{ brain, roles }`, so by `catalog.of=actor-clone-design` it belongs to
  the actor; a clone reads only its own actor dir (`define.brain-dir-layout-is-one-for-every-actor`)
- (b) breaks a clone with `--roles -driver`: it would run the driver's rules
- (c) pays discovery (a walk of `.agent/`) on every tool call — the cost this wish removes
- `rule.forbid.brain-dir-layout-divergence`: the file goes in every actor's brain dir, the repo actor's included

## .rework
clean — a path.

## .confidence — 90%

## .where
`1.vision.yield.md` § the solution

## .verdict
open.
