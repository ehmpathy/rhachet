# review: has-play-test-convention (r10)

## verdict: pass (no journey tests created, repo uses acceptance tests)

## methodology

### step 1: check for `.play.test.ts` convention

```bash
$ glob **/*.play.test.ts
# No files found

$ glob **/*.play.*.test.ts
# No files found
```

## why no journey tests

1. **no repros artifact**: behavior route skipped repros phase

```bash
$ glob .behavior/v2026_04_17.brain-boot-adapter/3.2.distill.repros.experience.*.md
# No files found
```

2. **tests derived from criteria/blueprint**: test cases came from usecases in 2.1.criteria.blackbox.yield.md and test coverage section in 3.3.1.blueprint.product.yield.md

## tests I created

| test file | type | convention |
|-----------|------|------------|
| genBrainConfigDir.integration.test.ts | integration | follows repo pattern |
| genClaudeMdContent.test.ts | unit | follows repo pattern |
| genBrainBootsAdapterForClaudeCode.test.ts | unit | follows repo pattern |
| init.hooks.acceptance.test.ts | acceptance | follows repo pattern |

## repo convention check

### step 2: verify repo convention

```bash
$ glob blackbox/cli/*.acceptance.test.ts | wc -l
47 files
```

This repo uses `.acceptance.test.ts` for CLI journey tests, not `.play.test.ts`.

### step 3: verify my tests match convention

| my test file | suffix | matches repo pattern? |
|--------------|--------|----------------------|
| init.hooks.acceptance.test.ts | `.acceptance.test.ts` | yes |
| genBrainConfigDir.integration.test.ts | `.integration.test.ts` | yes |
| genClaudeMdContent.test.ts | `.test.ts` | yes |
| genBrainBootsAdapterForClaudeCode.test.ts | `.test.ts` | yes |

### step 4: verify locations match convention

| my test file | location | matches repo pattern? |
|--------------|----------|----------------------|
| init.hooks.acceptance.test.ts | blackbox/cli/ | yes |
| genBrainConfigDir.integration.test.ts | src/domain.operations/init/ | yes |
| genClaudeMdContent.test.ts | src/_topublish/.../boots/ | yes |
| genBrainBootsAdapterForClaudeCode.test.ts | src/_topublish/.../boots/ | yes |

### step 5: verify journey coverage

The `init.hooks.acceptance.test.ts` provides journey coverage with 6 cases:

| case | given | when | then |
|------|-------|------|------|
| 1 | repo with claude config, no roles linked | init --hooks | no roles with hooks found |
| 2 | repo with roles package with hooks | init --hooks | hooks created |
| 3 | repo with role hooks | init --hooks again | idempotent |
| 4 | repo with role hooks | init --hooks claude-code | explicit brain slug works |
| 5 | repo with role hooks | role removes hook, init --hooks | hooks deleted |
| 6 | repo with multiple roles | both linked | hooks from both roles present |

## why this holds

1. **no `.play.test.ts` needed**: repo uses `.acceptance.test.ts` as fallback convention
2. **tests in correct locations**: blackbox/cli/ for acceptance, co-located for unit/integration
3. **suffixes match repo pattern**: `.acceptance.test.ts`, `.integration.test.ts`, `.test.ts`
4. **journey coverage complete**: 6 cases cover happy path, edge cases, idempotency
5. **no mismatch**: all conventions verified via step-by-step check
