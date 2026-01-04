# performance: roles init --command

## .what

measures execution latency of `rhachet roles init --repo <repo> --role <role> --command <name>`.

## .target

< 250ms average across 30 runs (actual: ~69ms warm cache)

## .patterns

| pattern | fixture | link required | test file |
|---------|---------|---------------|-----------|
| collocated | `with-perf-collocated` | no | `roles.init.performance.collocated.acceptance.test.ts` |
| published | `with-perf-test` | yes | `roles.init.performance.published.acceptance.test.ts` |

### collocated pattern

roles are checked directly into `.agent/repo=.this/role=<name>/`:
- use `--repo .this` to reference collocated roles
- init scripts in `.agent/repo=.this/role=<role>/inits/<name>.sh`
- no symlink resolution needed

### published pattern

roles are in `src/domain.roles/<role>/` (simulates npm package):
- requires `rhachet roles link` to create symlinks into `.agent/`
- use `--repo <slug>` that matches registry slug
- init scripts discovered via symlinks after link step

## .breakdown

| component | duration | notes |
|-----------|----------|-------|
| shell dispatch | ~1ms | bash case routes to rhachet-roles binary |
| bun binary load | ~50ms | warm cache; ~200ms cold (319 modules) |
| init discovery | ~10ms | locate init script in .agent/ |
| init execution | ~5ms | spawn and run shell script |

## .architecture

```
bin/run (symlink)
  └── bin/run.bun (shell dispatcher script)
        └── exec run.bun.rhachet-roles.bc (319 modules)
              └── roles init command
                    └── discover init script
                          └── spawn init shell script
```

shell dispatcher routes `roles` commands directly to `rhachet-roles` binary.
the `--command` flag specifies which init script to execute from:
`.agent/repo=<repo>/role=<role>/inits/<command>.sh`

## .init script requirements

init scripts must be:
- executable (`chmod +x`)
- located at `.agent/repo=<repo>/role=<role>/inits/<name>.sh`
- named to match the `--command` argument (without `.sh` extension)

## .why 250ms

shell dispatcher eliminates 102MB bun dispatcher binary load.
rhachet-roles binary has 319 modules (reduced from 681 via iso-time cutover).
250ms = bun load warm (100ms) + discovery (50ms) + init (50ms) + variance (50ms).
actual warm-cache performance: ~69ms.

## .comparison

| command | binary | modules | threshold | actual |
|---------|--------|---------|-----------|--------|
| run --skill | rhachet-run | 151 | 150ms | ~36ms |
| roles boot | rhachet-roles | 319 | 250ms | ~69ms |
| roles init --command | rhachet-roles | 319 | 250ms | ~69ms |

both `roles` commands use the same binary, so they share the same threshold.
init script spawn adds minimal overhead compared to roles boot.

## .use cases

init scripts typically:
- set up environment variables
- configure tool hooks
- install dependencies
- prepare workspace state

performance matters because init may run at session start.
