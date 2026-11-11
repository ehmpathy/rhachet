# F1 — pools live in one repo file

- **the fork:** one repo file with named sets (`.agent/brain.pools.yml`) · or a `creds.yml` in each actor's brain dir (#575's example)
- **taken:** the repo file. a per-actor file must exist in every actor dir or none (`rule.forbid.brain-dir-layout-divergence`), and hash actors are minted at enroll, so each would need a rendered copy that drifts. the per-clone flag carries the choice the actor file would have held
- **rework:** clean — a path and a loader
- **confidence:** 70% — the issue named the per-actor shape, and an actor-owned default pool may still be wanted
- **where:** `1.vision.yield.md` §2
- **verdict:** accepted as guessed, by the director on 2026-11-10
