# performance: roles boot

## .what

measures execution latency of `rhachet roles boot --repo <repo> --role <role>`.

## .target

< 250ms average across 30 runs (actual: ~69ms warm cache)

## .patterns

| pattern | fixture | link required | test file |
|---------|---------|---------------|-----------|
| collocated | `with-perf-collocated` | no | `roles.boot.performance.collocated.acceptance.test.ts` |
| published | `with-perf-test` | yes | `roles.boot.performance.published.acceptance.test.ts` |

### collocated pattern

roles are checked directly into `.agent/repo=.this/role=<name>/`:
- use `--repo .this` to reference collocated roles
- resources already in place, no symlink resolution
- role discovered via `.agent/` scan

### published pattern

roles are in `src/domain.roles/<role>/` (simulates npm package):
- requires `rhachet roles link` to create symlinks into `.agent/`
- use `--repo <slug>` that matches registry slug
- role discovered via symlinks after link step

## .breakdown

| component | duration | notes |
|-----------|----------|-------|
| shell dispatch | ~1ms | bash case routes to rhachet-roles binary |
| bun binary load | ~50ms | warm cache; ~200ms cold (319 modules) |
| role discovery | ~10ms | scan .agent/ structure, read briefs |
| output render | ~5ms | format and emit role context |

## .architecture

```
bin/run (symlink)
  └── bin/run.bun (shell dispatcher script)
        └── exec run.bun.rhachet-roles.bc (319 modules)
              └── roles boot command
                    └── discover and emit role context
```

shell dispatcher routes `roles` commands directly to `rhachet-roles` binary.
no intermediate bun process spawn needed.

## .why 250ms

shell dispatcher eliminates 102MB bun dispatcher binary load.
rhachet-roles binary has 319 modules (reduced from 681 via iso-time cutover).
250ms = bun load warm (100ms) + discovery (50ms) + render (50ms) + variance (50ms).
actual warm-cache performance: ~69ms.

## .comparison with run --skill

| command | binary | modules | threshold | actual |
|---------|--------|---------|-----------|--------|
| run --skill | rhachet-run | 151 | 150ms | ~36ms |
| roles boot | rhachet-roles | 319 | 250ms | ~69ms |

roles binary has more modules (319 vs 151), so slightly higher threshold.
