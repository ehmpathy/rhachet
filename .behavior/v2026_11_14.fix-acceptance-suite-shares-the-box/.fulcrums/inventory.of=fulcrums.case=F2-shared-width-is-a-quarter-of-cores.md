# F2 — shared-box width is a quarter of the cores, floor 1

- **the fork**: a share of cores (25%, floor 1) vs a fixed count (e.g. 2) vs 1 always
- **taken**: 25% floor 1, as a start point that execution tunes by measurement
- **why**: it scales with the box; 6 workers (50%) on 12 cores read load 55, so half that width or less is the right neighborhood; nice covers the residue
- **rework**: clean — one expression in `jest.acceptance.config.ts`
- **confidence**: 60% — no measurement yet; the cpu per worker was inflated by leaks in the issue's figure
- **where**: yield lever 1; cases 1, 2, 7, 9 headers
- **verdict**: director ruled 2026-11-15 — stays a start guess at 60%. verification passes only on a measured peer slowdown at 25% and at 50% width, on a quiet box, with the numbers recorded in this entry
- **measurements** (verification, 2026-11-16, `rhx measure.acceptance.share`, record
  `.log/role=any/skill=measure.acceptance.share/20261116T025403431Z.json`):
  - box: 4 cores, quiet (baseline load 1.3, cpu psi 3%)
  - scope: `enroll.acceptance`, `enroll.reach`, `enroll.focus`, `enroll.ends-its-brain`; suite at nice 10
  - peer: the default fixed single-thread cpu loop, median of 3

| width | box | peer solo | peer beside the suite | slowdown | peak load | peak cpu psi | suite wall |
|---|---|---|---|---|---|---|---|
| 25% | quiet | 2.39s | 2.82s | **18%** | 3.4 | 16% | 179s, exit 0 |
| 50% | quiet | 2.39s | 3.78s | **58%** | 8.9 | 86% | 147s, exit 0 |

- **the 50% row is main's width**: main ran `'50%'` at normal priority. this row ran it at nice 10, which favors
  the peer, so main's own harm here is at least 58% slowdown and 86% psi
- **a run that does not count**: an earlier measure (record `20261116T023802061Z.json`) read `quiet = no`
  (baseline load 5.2, psi 20%), had an 8s typecheck overlap it, and both suites exited 1 on a defect
  verification then fixed (`genHostLossWatch` read a pipe's end as a loss). its numbers inverted (25% read
  worse than 50%), the signature of a busy box, so it is not the record
- **verdict, from the measure**: 25% holds. it keeps a peer within a fifth of its own pace and cpu pressure
  at 16%, where 50% triples the slowdown and saturates the box. its cost is 32s of suite wall (22%) on a
  four-file scope, paid only by a scope wider than one worker; ci keeps `'50%'`. confidence 60% → 85%: one
  box, one scope; a 12-core laptop is not yet measured
