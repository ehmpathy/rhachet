# inventory.of=fulcrums

| case | title | rework | status | confidence |
|---|---|---|---|---|
| F1 | "every claude event" = the four a manifest row can name | clean | ruled: holds (director, 2026-11-27) | 90% |
| F2 | the wire timeout sits at a fixed floor (60 s), not the rows' max | clean | ruled: holds (director, 2026-11-27) | 85% |
| F3 | a mapped event with zero rows still gets its wire | clean | ruled: holds (director, 2026-11-27) | 88% |
| F4 | a repo with no manifest stays wire-less, by an explicit guard | clean | ruled: holds (director, 2026-11-27) | 95% |
| F5 | the acceptance tests under `blackbox/` sit inside the "only `src/**` and its tests" bound | clean | settled: holds (driver, 2026-11-27) | 85% |
| F6 | the per-brain catch in `setHookDispatchersForTarget` stays as it is | clean | settled: holds (driver, 2026-11-27) | 92% |
| F7 | a raised wire timeout goes unreported this round | clean | settled: holds (driver, 2026-11-27) | 85% |
| F8 | two stitch integration tests that skip in ci stay out of this pr | clean | settled: holds (driver, 2026-11-27) | 80% |
| F9 | a later row prints the hooks report, not the swap report | clean | settled: holds (driver, 2026-11-27) | 75% |
| F10 | transformer caselists and given-level thens keep the file shape | clean | settled: holds (driver, 2026-11-27) | 85% |
| F11 | a sync with no hooked role settles its wires | clean | settled: the worsened half lands in this pr; the stale-row prune waits (driver, 2026-11-27, S3) | 85% |
| F12 | a sync reads past a corrupt manifest row | clean | settled: lands in this pr (driver, 2026-11-27, S3) | 90% |
| F13 | the vision's pushback footnote keeps its reversal form | clean | settled: holds (driver, 2026-11-27) | 85% |
| F14 | the orchestrator's null-manifest swap is clamped at the cli | clean | settled: clamped in this pr (driver, 2026-11-27) | 90% |

entries: `inventory.of=fulcrums.case=F$n-$slug.md`
