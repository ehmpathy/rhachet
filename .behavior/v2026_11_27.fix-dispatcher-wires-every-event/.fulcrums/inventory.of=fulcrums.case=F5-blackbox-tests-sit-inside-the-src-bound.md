# F5 — the acceptance tests under `blackbox/` sit inside the "only `src/**` and its tests" bound

## .the fork
- a: `blackbox/**` is a test tier of `src/**` (it runs the built cli that `src/**` compiles to), so its tests and snaps are in bounds
- b: the bound means the `src/` tree alone; the dispatched-payload proofs drop to integration tests under `src/`, and the six snaps that move with the report shape are left stale

## .taken = a, why
- the bound names what it guards: "no package.json, lockfile, config, practs, or `.agent/` edits", the files the parallel declapract upgrade owns. none of those five sits under `blackbox/`, and the upgrade's unstaged edits touch no `blackbox/` file (`git status --short`)
- the wish asks for "a test per case, red without the change, green with it". the per-case proof of a later row that fires in a seat already synced is a real dispatch through the built cli; only the acceptance tier runs that path
- b cannot hold: the report shape (`N rules → 4 dispatchers`) is pinned in six acceptance snaps. a change to `src/**` alone leaves them red in ci, and the wish asks for a pr green on `--watch`
- the vision states this read under `.open questions` and the director approved the vision

## .rework = clean, why
the [case2] journey moves to `src/` integration tests by a file move plus a fixture build; no prod code depends on where the test sits. the snaps are not optional under either branch.

## .confidence = 85%, why low
the bound's text says `src/**`; the read rests on its purpose, not its words. no explicit verdict.

## .where
`blackbox/cli/hooks.dispatch.acceptance.test.ts`, `blackbox/cli/upgrade.acceptance.test.ts`, `blackbox/cli/__snapshots__/*`

## .verdict
settled: holds (driver, 2026-11-27). the bound guards the five files the declapract upgrade owns, and
no `blackbox/` file is among them. the per-case proof the wish asks for runs only in this tier, and ci
ran it green on the head. no harm to a human rides on either read.
