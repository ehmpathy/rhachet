# accurate performance measurement

## .what

measure CLI performance overhead without test harness artifacts.

## .why

Node.js `spawnSync` adds ~150-200ms overhead when it spawns large bun-compiled binaries (~100MB). this overhead is:
- specific to Node.js process fork behavior
- not representative of real-world bash usage
- inconsistent across runs due to disk cache state

accurate measurement requires:
- bash-native time measurement
- shell spawn correction (subtract shell startup overhead)
- warmup runs (avoid cold cache penalties)
- multiple runs for statistical stability

## .problem

when measured via Node.js spawnSync:
```
rhachet (via spawnSync): ~270ms
direct skill (via spawnSync): ~28ms
overhead: ~242ms  ❌ fails 100ms target
```

when measured via bash (with warmup):
```
rhachet (via bash): ~85ms
direct skill (via bash): ~25ms
overhead: ~60ms  ✅ passes 100ms target
```

the difference is Node.js process fork overhead for 100MB binaries.

## .research: industry best practices

based on [hyperfine](https://github.com/sharkdp/hyperfine) and shell benchmark research:

### shell spawn correction
hyperfine corrects for shell startup overhead by:
1. run calibration with empty command (multiple times)
2. measure shell startup time
3. subtract from all measurements

this isolates actual command execution from shell initialization costs.

### warmup runs
run 3-5 warmup iterations before measurement to:
- populate disk cache with binary
- warm filesystem metadata
- stabilize system state

critical for programs with significant disk I/O (like 100MB binaries).

### statistical rigor
- collect 10-20+ samples for statistical significance
- calculate mean, standard deviation
- detect and flag statistical outliers
- report confidence intervals when possible

### isolation
- avoid measurement when system load is high
- interleave measurements (direct, rhachet, direct, rhachet...)
- detect outliers that indicate interference

sources:
- [hyperfine](https://github.com/sharkdp/hyperfine)
- [shellbench](https://github.com/shellspec/shellbench)
- [Performance Shell Benchmark research](https://www.researchgate.net/publication/388829111)

## .solution

use bash-native measurement via `perf.test.sh` skill:

```bash
# measure rhachet overhead accurately
./.agent/repo=.this/role=any/skills/perf.test.sh --measure
```

the skill implements:
1. **warmup phase**: 5 runs to warm disk cache
2. **shell correction**: measures empty command baseline
3. **interleaved measurement**: alternates direct/rhachet to detect drift
4. **statistical output**: mean, min, max, outlier detection
5. **threshold check**: exits 0 if overhead < threshold

## .architecture

```
┌─────────────────────────────────────────────────────────┐
│ acceptance test (jest)                                  │
│                                                         │
│   invokes perf.test.sh via spawnSync                    │
│   (single spawn, skill handles all iterations)          │
│                                                         │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ perf.test.sh --measure                                  │
│                                                         │
│   1. warmup: run 5 iterations (discard)                 │
│   2. calibrate: measure empty command baseline          │
│   3. measure: for i in 1..N:                            │
│        - measure direct skill                           │
│        - measure rhachet                                │
│   4. analyze: mean, stddev, outliers                    │
│   5. report: pass/fail against threshold                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## .usage

```bash
# minimal mode (target for measurement)
./.agent/repo=.this/role=any/skills/perf.test.sh

# measure mode with defaults (30 runs, 100ms threshold)
./.agent/repo=.this/role=any/skills/perf.test.sh --measure

# custom benchmark
./.agent/repo=.this/role=any/skills/perf.test.sh --measure --runs 50 --threshold 150

# test specific binary
./.agent/repo=.this/role=any/skills/perf.test.sh --measure --binary ./bin/run
```

## .acceptance test pattern

```typescript
// single spawnSync to invoke the bash skill
// the skill handles warmup, measurement, and analysis internally
const result = spawnSync(PERF_SKILL, ['--measure', '--runs', '30', '--threshold', '100'], {
  cwd: repo.path,
  stdio: 'pipe',
});

// skill exits 0 if overhead < threshold, 1 otherwise
expect(result.status).toEqual(0);
```

## .key insight

the 100ms overhead target is achievable when measured accurately:
- rhachet binary internal time: ~50-100ms
- direct skill time: ~25ms
- actual overhead: ~25-75ms

Node.js spawn overhead is an artifact of the test harness, not the CLI.
