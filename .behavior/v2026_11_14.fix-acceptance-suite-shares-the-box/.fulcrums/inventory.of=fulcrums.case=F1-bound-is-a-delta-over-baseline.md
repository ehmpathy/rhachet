# F1 — the bound is a delta over the box's baseline

- **the fork**: an absolute bound (load ≤ cores, cpu psi < ~20%, as the issue states) vs a delta over the box's own baseline, led by how much a peer's fixed workload slows
- **taken**: the delta, peer slowdown ≤ ~25% primary; load and psi still reported in the pr
- **why**: this grove read load 6.2 / psi 29% on 4 cores with no suite live, so an absolute psi bound cannot hold here; and psi counts the niced suite's own waits, so it cannot grade what peers feel
- **rework**: clean — a number in the verification stone and the yield's bound section
- **confidence**: 70% — the wisher may want the issue's absolute figures held on an idle laptop only, which the vision also reports
- **where**: `1.vision.yield.md` `.the bound`
- **verdict**: confirmed by the director, 2026-11-15 — the bound is a delta over the box's baseline, led by peer slowdown
