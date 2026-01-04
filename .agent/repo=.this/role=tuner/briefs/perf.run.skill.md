# performance: run --skill

## .what

measures execution latency of `rhachet run --skill <name>`.

## .target

< 150ms average across 30 runs (actual: ~36ms warm cache)

## .patterns

| pattern | fixture | link required | test file |
|---------|---------|---------------|-----------|
| collocated | `with-perf-collocated` | no | `run.performance.collocated.acceptance.test.ts` |
| published | `with-perf-test` | yes | `run.performance.published.acceptance.test.ts` |

### collocated pattern

roles are checked directly into `.agent/repo=.this/role=<name>/`:
- resources already in place, no symlink resolution
- empty `rhachet.use.ts` (no registries declared)
- skill discovered via `.agent/` scan

### published pattern

roles are in `src/domain.roles/<role>/` (simulates npm package):
- requires `rhachet roles link` to create symlinks into `.agent/`
- `rhachet.use.ts` declares role registry with resource paths
- skill discovered via symlinks after link step

## .breakdown

| component | duration | notes |
|-----------|----------|-------|
| shell dispatch | ~1ms | bash case statement routes to binary |
| bun binary load | ~25ms | warm cache; ~200ms cold |
| CLI logic | ~5ms | argument parse, skill discovery |
| skill execution | ~5ms | shell script invocation |

## .architecture

```
bin/run (symlink)
  └── bin/run.bun (shell dispatcher script)
        └── exec run.bun.rhachet-run.bc (151 modules)
              └── spawn skill script
```

the shell dispatcher routes commands without a bun binary load.
`run` commands go directly to the specialized `rhachet-run` binary.

## .why 150ms

shell dispatcher eliminates the 102MB bun dispatcher binary load.
150ms = bun load warm (50ms) + CLI (20ms) + skill (30ms) + variance (50ms).
actual warm-cache performance: ~36ms.

## .measurement notes

use `perf.test.sh --measure --cmd "./bin/run run --skill <name>"` for accurate measurement.
see: `briefs/measure.performance.accurate.md` for details.
