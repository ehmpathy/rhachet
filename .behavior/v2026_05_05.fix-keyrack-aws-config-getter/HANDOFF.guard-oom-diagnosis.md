# handoff: guard OOM diagnosis

## symptom

`route.stone.set --as passed` for execution stone fails with all 8 peer reviews OOM:

```
FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory
```

each review uses ~4GB before crash (~300-900s per review).

---

## root cause

the guard file at `.behavior/v2026_05_05.fix-keyrack-aws-config-getter/5.1.execution.phase0_to_phaseN.guard` specifies:

```yaml
artifacts:
  - "$route/5.1.execution.phase0_to_phaseN.yield.md"
  - "src/**/*"    # <-- THIS IS THE PROBLEM
```

the `"src/**/*"` pattern matches **700+ files** (every file under `src/`).

the guard's output shows all 700+ files as "artifacts":
```
├─ artifacts
│   ├─ 5.1.execution.phase0_to_phaseN.yield.md
│   ├─ directory.ts
│   ├─ index.ts
│   ├─ sdk.actors.ts
│   ... (700+ more files)
```

even though the actual diff is **1 code file**:
```bash
$ git diff --name-only origin/main | grep '\.ts$'
src/domain.operations/keyrack/adapters/vaults/aws.config/vaultAdapterAwsConfig.ts
```

---

## evidence

### actual diff vs artifacts collected

| source | file count |
|--------|------------|
| `git diff --name-only origin/main` (ts files) | 1 file |
| guard artifacts (`src/**/*`) | 700+ files |

### review command analysis

each peer review runs:
```bash
$rhx review --repo bhrain --mode hard --rules '...' --diffs since-main --paths-with '**/*.ts' --join intersect
```

- `--mode hard` = load full file contents
- `--diffs since-main` = should limit to diff files
- `--join intersect` = should intersect diffs with paths filter

**hypothesis:** the `--join intersect` works for the review command itself, but the guard's artifact collection (`src/**/*`) loads into memory separately, OOM occurs before the review even starts.

### memory usage

each review process hits ~4GB heap limit:
```
Mark-Compact 3960.8 (4129.8) -> 3950.5 (4130.6) MB
```

---

## potential fixes

### option 1: narrow the artifacts pattern

change the guard's artifacts from:
```yaml
artifacts:
  - "src/**/*"
```

to narrower scope:
```yaml
artifacts:
  - "src/domain.operations/keyrack/**/*"
```

or use the diff directly:
```yaml
artifacts:
  - "$diffs"
```

### option 2: increase node heap

```bash
NODE_OPTIONS="--max-old-space-size=8192" rhx route.stone.set ...
```

this is a workaround, not a fix.

### option 3: use `--mode soft` for reviews

the guard uses `--mode hard` which loads full file contents. `--mode soft` (paths only) would reduce memory but may affect review quality.

### option 4: investigate artifact load logic

the route system's artifact collection logic may need optimization to:
1. not load file contents until needed
2. respect diff filter before load
3. stream files instead of load all into memory

---

## fix status

the keyrack aws.config fix is **complete and tested**:

| check | status |
|-------|--------|
| implementation | done — `vaultAdapterAwsConfig.ts` lines 76-89 |
| types | passed |
| lint | passed |
| unit tests | 471 passed |
| integration tests | 242 passed (key file passed all 4 tests) |
| self-reviews | 8/8 written |
| peer reviews | blocked by OOM |
| judge | passed (0.7s) |

the code is ready. only the guard's OOM blocks the route.

---

## recommendation

1. **short term:** human bypasses guard or reduces artifact scope
2. **medium term:** fix guard to use narrower artifact pattern
3. **long term:** investigate route system's artifact load for large repos

---

## files referenced

- guard: `.behavior/v2026_05_05.fix-keyrack-aws-config-getter/5.1.execution.phase0_to_phaseN.guard`
- implementation: `src/domain.operations/keyrack/adapters/vaults/aws.config/vaultAdapterAwsConfig.ts`
- review outputs: `.behavior/v2026_05_05.fix-keyrack-aws-config-getter/.route/5.1.execution.phase0_to_phaseN.guard.review.*.md`
