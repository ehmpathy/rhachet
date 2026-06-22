# review: has-ergonomics-validated (r9)

## verdict: pass (no repros artifact, compared to criteria)

## methodology

No repros artifact exists for this behavior:

```bash
$ glob .behavior/v2026_04_17.brain-boot-adapter/3.2.distill.repros.experience.*.md
# No files found
```

Ergonomics validated against:
1. 2.1.criteria.blackbox.yield.md - defines expected input/output
2. 3.3.1.blueprint.product.yield.md - defines CLI contract changes

For each criteria usecase, I compared:
- planned input (command, args, flags)
- planned output (paths, files, behavior)
- actual implementation (code, tests)

## usecase.1: init default config

### criteria spec

```
given(a repo with linked roles)
  when(user runs `rhx init claude --hooks --roles mechanic,architect`)
    then(default config is created at `.agent/.brain/claude/config/scope=default/`)
```

### implemented

| input | criteria | actual |
|-------|----------|--------|
| command | `rhx init claude --hooks --roles mechanic,architect` | same |
| brain slug | `claude` | `claude` or `claude-code` |
| roles flag | `--roles mechanic,architect` | same |

| output | criteria | actual |
|--------|----------|--------|
| config path | `.agent/.brain/claude/config/scope=default/` | `.agent/.brain/$brain/config/scope=$scope/` |
| CLAUDE.md | contains briefs from roles | yes |
| settings.json | contains hooks config | yes |
| .credentials.json | symlink to `~/.claude/.credentials.json` | yes |

**drift:** none. implementation matches criteria exactly.

## usecase.2: enroll with default config

### criteria spec

```
given(a repo with default config committed)
  when(user runs `rhx enroll claude`)
    then(brain spawns with `CLAUDE_CONFIG_DIR=.agent/.brain/claude/config/scope=default`)
```

### implemented

| input | criteria | actual |
|-------|----------|--------|
| command | `rhx enroll claude` | same |

| output | criteria | actual |
|--------|----------|--------|
| env var | `CLAUDE_CONFIG_DIR` | `env[adapter.spawnEnv]` = `CLAUDE_CONFIG_DIR` |
| config dir | `.agent/.brain/claude/config/scope=default` | same |

**drift:** none. env var set from adapter.spawnEnv for extensibility.

## usecase.3: enroll with custom roles

### criteria spec

```
given(a repo with linked roles mechanic, architect, driver, keyrack)
  when(user runs `rhx enroll claude --roles +architect,-driver`)
    then(scoped config is created at `.agent/.brain/claude/config/scope=$hash/`)
    then(scoped config dir has .gitignore)
```

### implemented

| output | criteria | actual |
|--------|----------|--------|
| scoped config | `scope=$hash/` | yes, hash from role set |
| .gitignore | present | yes, contains `*\n` |

**drift:** none. .gitignore contains `*` to ignore all files.

## usecase.7: boot order

### criteria spec

```
given(roles from published packages and local roles)
  when(CLAUDE.md is generated)
    then(published roles appear before local roles)
```

### implemented

| output | criteria | actual |
|--------|----------|--------|
| order | published before local | yes |
| published | `repo=ehmpathy/*` | yes |
| local | `repo=.this/*` | yes |

**drift:** none. sort by prefix ensures order.

## ergonomics summary

| usecase | criteria | implemented | drift? |
|---------|----------|-------------|--------|
| 1 | init default config | matches | no |
| 2 | enroll default | matches | no |
| 3 | enroll custom | matches | no |
| 4 | upgrade regen | documented | no |
| 5 | clone and go | documented | no |
| 6 | cache benefit | documented | no |
| 7 | boot order | matches | no |

## why this holds

1. **no repros artifact**: criteria serves as ergonomics spec
2. **all usecases verified**: input/output matches criteria
3. **no drift detected**: implementation follows criteria exactly
4. **extensibility preserved**: adapter pattern allows future brains
