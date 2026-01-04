# performance: run --init

## .what

measures execution latency of `rhachet run --init <name>`.

## .target

- collocated: < 250ms average across 30 runs
- published: < 300ms average across 30 runs (extra variance from symlink resolution)
- actual warm-cache: ~69ms

## .patterns

| pattern | fixture | link required | test file |
|---------|---------|---------------|-----------|
| collocated | `with-perf-collocated` | no | `run.init.performance.collocated.acceptance.test.ts` |
| published | `with-perf-test` | yes | `run.init.performance.published.acceptance.test.ts` |

### collocated pattern

roles are checked directly into `.agent/repo=.this/role=<name>/`:
- resources already in place, no symlink resolution
- empty `rhachet.use.ts` (no registries declared)
- init discovered via `.agent/` scan

### published pattern

roles are in `src/domain.roles/<role>/` (simulates npm package):
- requires `rhachet roles link` to create symlinks into `.agent/`
- `rhachet.use.ts` declares role registry with resource paths
- init discovered via symlinks after link step

## .breakdown

| component | duration | notes |
|-----------|----------|-------|
| shell dispatch | ~1ms | bash case statement routes to binary |
| bun binary load | ~25ms | warm cache; ~200ms cold |
| CLI logic | ~5ms | argument parse, init discovery |
| init execution | ~30ms | shell script invocation |

## .architecture

```
bin/run (symlink)
  └── bin/run.bun (shell dispatcher script)
        └── exec run.bun.rhachet-run.bc (151 modules)
              └── spawn init script
```

the shell dispatcher routes commands without a bun binary load.
`run --init` commands go directly to the specialized `rhachet-run` binary (same as `run --skill`).

## .why 250ms/300ms

shell dispatcher eliminates the 102MB bun dispatcher binary load.
- collocated 250ms = bun load warm (50ms) + CLI (50ms) + init (100ms) + variance (50ms)
- published 300ms = collocated + symlink resolution variance (50ms)
actual warm-cache performance: ~69ms.
threshold is higher than skill because inits may do more work (e.g., directory creation).

## .measurement notes

use `perf.test.sh --measure --cmd "./bin/run run --init <name>"` for accurate measurement.
see: `briefs/measure.performance.accurate.md` for details.
