# define.init-enroll-brain-config

## .what

relationship between `rhx init`, `rhx enroll`, brains, and brain configs.

## .key distinction

| concept | what it is | where it lives |
|---------|------------|----------------|
| **linked roles** | all roles available (superset) | `.agent/repo=*/role=*/` |
| **default config** | roles enrolled by default (subset) | `.agent/.brain/$brain/config/scope=default/` |

`rhx init claude --hooks --roles X` controls which linked roles become the default config.

## .commands

### rhx init flags

| flag | purpose | output |
|------|---------|--------|
| `--brain $slug` | target brain (default: `claude`) | determines which brain config to update |
| `--roles X,Y` | link roles from packages | `.agent/repo=*/role=*/` symlinks |
| `--hooks` | generate default config | `.agent/.brain/$brain/config/scope=default/` |
| `--keys` | init keyrack manifest | `.agent/keyrack.yml` |
| `--prep` | persist to package.json | `scripts["prepare:rhachet"]`, `scripts["prepare"]` |

**key insight**: `--hooks` is what creates/updates the brain config. without `--hooks`, roles are linked but config is NOT updated.

```bash
# link roles only (no config update)
rhx init claude --roles mechanic,architect

# link roles AND update brain config
rhx init claude --hooks --roles mechanic,architect

# explicit brain target (non-default)
rhx init codex --hooks --roles mechanic,architect
rhx init --brain codex --hooks --roles mechanic,architect

# link roles, update hooks, init keyrack, persist to prepare
rhx init claude --hooks --keys --prep --roles mechanic,architect
```

### rhx enroll

| command | purpose | output |
|---------|---------|--------|
| `rhx enroll $brain` | spawn brain with default config | uses `scope=default` (from `rhx init $brain --hooks`) |
| `rhx enroll $brain --roles +X,-Y` | spawn brain with custom config | creates `scope=$hash`, then spawns |

**syntax**: `rhx enroll claude` and `rhx enroll --brain claude` are equivalent.

**note**: `rhx enroll claude` (no `--roles`) uses the DEFAULT config, not "all linked roles". 

the default config may DIFFER from linked roles:
- linked roles = all roles in `.agent/repo=*/role=*/` (accumulated over time)
- default config = roles from last `rhx init claude --hooks --roles X` (specific subset)

example:
```
# link 5 roles over time
rhx init claude --roles mechanic
rhx init claude --roles architect,keyrack
rhx init claude --roles driver,ergonomist

# but set default config with only 3
rhx init claude --hooks --roles mechanic,architect,keyrack
# → default config has 3 roles, but 5 roles are linked
```

## .flow

```
rhx init claude --roles mechanic,architect
└─ links roles to .agent/repo=*/role=*/
   (no config update without --hooks)

rhx init claude --hooks --roles mechanic,architect
├─ links roles to .agent/repo=*/role=*/
└─ creates .agent/.brain/claude/config/scope=default/
   ├─ CLAUDE.md (briefs from specified roles)
   ├─ settings.json (hooks config)
   └─ .credentials.json (symlink to ~/.claude/.credentials.json)

rhx enroll claude
rhx enroll --brain claude
└─ spawns: CLAUDE_CONFIG_DIR=.agent/.brain/claude/config/scope=default claude
   (uses default config as-is, no discovery)

rhx enroll claude --roles +architect,-driver
rhx enroll --brain claude --roles +architect,-driver
├─ discovers linked roles from .agent/
├─ computes custom role set from spec (+/- deltas)
├─ creates .agent/.brain/claude/config/scope=$hash/
│  ├─ CLAUDE.md (briefs from custom role set)
│  ├─ settings.json (hooks config)
│  └─ .credentials.json (symlink)
└─ spawns: CLAUDE_CONFIG_DIR=.agent/.brain/claude/config/scope=$hash claude
```

## .config location

all brain configs live in `.agent/.brain/$brain/config/scope=$scope/`

**scope** = which roles are enrolled. the scope identifier is:

| scope | when | role set |
|-------|------|----------|
| `default` | `rhx enroll claude` (no `--roles`) | roles from last `rhx init claude --hooks` (may be subset of linked) |
| `$hash` | `rhx enroll claude --roles +X,-Y` | custom role set, hash of final roles |

**linked vs enrolled**:
- **linked roles** = all roles in `.agent/repo=*/role=*/` (superset, accumulated)
- **enrolled roles** = roles in a specific scope's config (subset selected for enrollment)

the hash ensures each unique role combination gets its own config dir. two enrollments with same roles = same hash = same config.

## .see also

- `src/contract/cli/invokeEnroll.ts` — enroll command implementation
- `src/domain.operations/enroll/enrollBrainCli.ts` — brain spawn logic
- `src/domain.operations/enroll/genBrainCliConfigArtifact.ts` — config generation
