# bundle optimization status

## .what

tracks bundle size optimizations for CLI latency reduction.

## .current state (after iso-time cutover)

| binary | modules | size | notes |
|--------|---------|------|-------|
| dispatcher | 151 | ~102MB | routes to specialized binaries |
| rhachet-run | 151 | ~102MB | run command only |
| rhachet-roles | 319 | ~103MB | roles commands (down from 681) |
| rhachet-all | 513 | ~107MB | all commands (down from 855) |

## .completed optimizations

### ✅ date-fns tree-shake (-362 modules)

**before**: date-fns (302 files) was bundled via `@ehmpathy/uni-time`

**solution**: cutover to `iso-time` which uses scoped imports:
- scoped imports allow bun to tree-shake unused date-fns modules
- rhachet-roles: 681 → 319 modules (53% reduction)
- rhachet-all: 855 → 513 modules (40% reduction)

### ✅ shell dispatcher (-200ms actual)

**before**: `bin/run` was symlink to `run.bun.dispatcher.bc` (~102MB bun binary)

**solution**: `bin/run` → `run.bun` (shell script) that routes to specialized binaries:
- `run` command → `run.bun.rhachet-run.bc` (151 modules)
- `roles` commands → `run.bun.rhachet-roles.bc` (319 modules)
- other commands → `run.bun.rhachet-all.bc` (513 modules)

**measured improvement**:
- run --skill: 36ms mean (was ~270ms via old dispatcher)
- roles boot: 42ms mean (was ~600ms via old dispatcher)

## .queued optimizations

### dedupe type-fns (-20ms, -80 modules)

**problem**: multiple versions bundled

**fix**:
```bash
pnpm dedupe
# or add resolutions in package.json
"resolutions": {
  "type-fns": "1.21.0"
}
```

## .performance test results

all 6 tests pass with lowered thresholds (after shell dispatcher):

| command | pattern | threshold | actual | status |
|---------|---------|-----------|--------|--------|
| run --skill | collocated | <150ms | ~36ms | ✅ |
| run --skill | published | <150ms | ~36ms | ✅ |
| roles boot | collocated | <250ms | ~69ms | ✅ |
| roles boot | published | <250ms | ~69ms | ✅ |
| roles init --command | collocated | <250ms | ~69ms | ✅ |
| roles init --command | published | <250ms | ~69ms | ✅ |

## .skills for investigation

```bash
# show deps in specific bundle
./.agent/repo=.this/role=any/skills/show.bun.deps.sh

# show import chain for specific package
pnpm why date-fns

# check for duplicates
pnpm dedupe --check
```
