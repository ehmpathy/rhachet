# F8 — a pool flag on a repo with no pool file is refused

- **the fork:** `rhx enroll claude --brain-reach <email>` (or `--brain-pool <name>`) in a repo with no `.agent/brain.pools.yml` — refuse the spawn · fall back to the shared login · treat the reach as a pool of one with no file
- **taken:** refuse, exit 2, before the brain starts, with the fix: declare the pool file with that reach, or drop the flag to use the shared login. a flag names an account the operator meant to bill; a silent fallback to the shared login bills a different one, and a pool of one with no file bypasses "the pool file is the one list of billable accounts" (§2)
- **rework:** clean — one guard at enroll; no channel, file shape, or later stone depends on it
- **confidence:** 80% — the pool-of-one option has a real ergonomic pull (a one-account box needs no file), and the commander may prefer it
- **where:** raised by peer review i003, dimensional-decomposition nitpick.1 (D9 × D3 `undeclared`); the vision's inventory rows `pick × reach in no pool` and `pick × no pool declared` do not yet name this cell. lands at the criteria stage with F9
- **verdict:** accepted as guessed, by the director on 2026-11-10
