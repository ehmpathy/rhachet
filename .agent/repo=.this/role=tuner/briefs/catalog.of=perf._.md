# catalog.of=perf

> cli latency: what each command costs, how to measure it, and what has been cut. one row per brief.

| brief | what it settles |
|---|---|
| `measure.performance.accurate` | measure in bash with warmup and shell correction (`perf.test.sh --measure`); `spawnSync` adds ~150–200ms of harness artifact |
| `bun.compile.realistic.durations` | a bun `.bc` binary is 50–100MB; ~200–400ms cold, ~40–80ms warm |
| `perf.bundle.optimization` | module counts per binary, and the cuts made (iso-time, the shell dispatcher) |
| `perf.run.skill` | `run --skill`: < 150ms target, ~36ms warm |
| `perf.run.init` | `run --init`: < 250ms (collocated) / < 300ms (published), ~69ms warm |
| `perf.roles.boot` | `roles boot`: < 250ms target, ~69ms warm |
| `perf.roles.init` | `roles init --command`: < 250ms target, ~69ms warm |
