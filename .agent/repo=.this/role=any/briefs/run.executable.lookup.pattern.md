# run executable lookup pattern

## .what

`run --skill` and `run --init` auto-discover executables from `.agent/` directories. the `--repo` and `--role` options are only required for disambiguation when multiple executables share the same name.

## .why

- reduces friction for common case (single executable with given name)
- enables quick invocation without verbose options
- mirrors how shell PATH lookup works (find first match, error on ambiguity)

## .how

### discovery algorithm

1. scan all `.agent/repo=*/role=*/skills/*.sh` (for skills) or `.agent/repo=*/role=*/inits/*.sh` (for inits)
2. filter by executable name (e.g., `say-hello`, `perf.init`)
3. if exactly one match → execute it
4. if zero matches → error with "not found"
5. if multiple matches → error with "ambiguous, specify --repo and/or --role"

### disambiguation options

| option | purpose |
|--------|---------|
| `--repo <slug>` | filter to `.agent/repo=<slug>/...` |
| `--role <slug>` | filter to `.agent/.../role=<slug>/...` |

both can be combined for full specificity.

## .examples

### single match (auto-discovery)

```sh
# finds .agent/repo=.this/role=any/skills/say-hello.sh
rhachet run --skill say-hello

# finds .agent/repo=.this/role=perf-role/inits/perf.init.sh
rhachet run --init perf.init
```

### multiple matches (disambiguation required)

```sh
# error: multiple skills named "deploy" found in .agent/
rhachet run --skill deploy

# specify repo to disambiguate
rhachet run --skill deploy --repo infra

# specify role to disambiguate
rhachet run --skill deploy --role devops

# full specificity
rhachet run --skill deploy --repo infra --role devops
```

### no match

```sh
# error: skill "nonexistent" not found in .agent/
rhachet run --skill nonexistent
```

## .applies to

- `run --skill <name>` - discovers from `skills/` directories
- `run --init <name>` - discovers from `inits/` directories

## .see also

- `bin.dispatcher.pattern.md` - how bun/jit routes commands
- `code.test.accept.blackbox.md` - acceptance test patterns for run commands
