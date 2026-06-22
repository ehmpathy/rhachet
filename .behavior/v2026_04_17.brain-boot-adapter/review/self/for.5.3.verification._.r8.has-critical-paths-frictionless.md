# review: has-critical-paths-frictionless (r8)

## verdict: pass (no repros artifact, critical paths derived from criteria)

## methodology

No repros artifact exists for this behavior:

```bash
$ glob .behavior/v2026_04_17.brain-boot-adapter/3.2.distill.repros.experience.*.md
# No files found
```

Critical paths derived from 2.1.criteria.blackbox.yield.md usecases:
1. usecase.1: `rhx init claude --hooks --roles mechanic,architect`
2. usecase.2: `rhx enroll claude`
3. usecase.3: `rhx enroll claude --roles +architect,-driver`
4. usecase.7: boot order (published roles before local)

## critical path 1: init config

**path:** `rhx init claude --hooks --roles mechanic,architect`

### implementation trace

| step | file | line | action |
|------|------|------|--------|
| 1 | invokeInit.ts | - | parse CLI args, call genBrainConfigDir |
| 2 | genBrainConfigDir.ts | 23-31 | compute path `.agent/.brain/$slug/config/scope=$scope/` |
| 3 | genBrainConfigDir.ts | 31 | `mkdir(configDir, { recursive: true })` |
| 4 | genBrainConfigDir.ts | 34-35 | call adapter.genBootContent, adapter.dao.set |
| 5 | genBrainConfigDir.ts | 37-38 | write settings.json |
| 6 | genBrainConfigDir.ts | 40 | call adapter.genCredentialsSymlink |
| 7 | genBrainConfigDir.ts | 43-45 | add .gitignore if scoped |

### test proof

```bash
$ rhx git.repo.test --what integration --scope genBrainConfigDir
tests: 4 passed, 0 failed
```

### friction check

Walked through code line by line. No friction points:
- path construction is deterministic
- mkdir with recursive avoids ENOENT
- adapter delegation is clean

## critical path 2: enroll with default config

**path:** `rhx enroll claude`

### implementation trace

| step | file | line | action |
|------|------|------|--------|
| 1 | invokeEnroll.ts | - | parse CLI, lookup adapter, call enrollBrainCli |
| 2 | enrollBrainCli.ts | 32-38 | build args: `['--sources', 'local', '--config', configPath, ...args]` |
| 3 | enrollBrainCli.ts | 41-44 | if adapter provided, set `env[adapter.spawnEnv] = configDir` |
| 4 | enrollBrainCli.ts | 48-52 | spawn child process with inherited stdio |

### test proof

```bash
$ rhx git.repo.test --what unit --scope enrollBrainCli
tests: passed (includes env var assertions)
```

Key assertion from enrollBrainCli.test.ts:
```typescript
it('env includes spawnEnv from adapter', () => {
  // verifies env[bootsAdapter.spawnEnv] = configDir
});
```

### friction check

Walked through code line by line. No friction points:
- env var set correctly from adapter.spawnEnv
- spawn uses inherited stdio (no buffer delay issues)
- exit code forwarded correctly

## critical path 3: enroll with custom roles

**path:** `rhx enroll claude --roles +architect,-driver`

### implementation trace

| step | file | action |
|------|------|--------|
| 1 | invokeEnroll.ts | compute scope hash from role set |
| 2 | genBrainConfigDir.ts:43-45 | add .gitignore for scoped config |
| 3 | enrollBrainCli.ts | spawn with scoped config dir |

### test proof

genBrainConfigDir.integration.test.ts assertions:
- case 2: `.gitignore` exists for scoped config
- case 3: no `.gitignore` for default config

### friction check

Walked through scope isolation logic. No friction points:
- scope hash deterministic for same role set
- .gitignore prevents accidental commit of scoped configs

## critical path 4: boot order

**path:** CLAUDE.md generation orders published before local

### implementation trace

genClaudeMdContent.ts sorts roles by prefix:
- `repo=ehmpathy/*` → first (stable, cacheable)
- `repo=.this/*` → last (volatile)

### test proof

genClaudeMdContent.test.ts:
```typescript
it('should order published roles before local roles', async () => {
  const content = await genClaudeMdContent({ roles, repoPath });
  const publishedIndex1 = content.indexOf('repo=ehmpathy/role=mechanic');
  const localIndex1 = content.indexOf('repo=.this/role=any');
  expect(publishedIndex1).toBeLessThan(localIndex1);
});
```

### friction check

Verified sort logic. No friction points:
- prefix match is unambiguous
- stable before volatile maximizes cache hits

## why this holds

1. **each critical path has implementation trace**: line-by-line walkthrough
2. **each critical path has test proof**: unit/integration tests pass
3. **each critical path has friction check**: manual code review found no issues
4. **no repros artifact**: criteria usecases serve as source of truth
