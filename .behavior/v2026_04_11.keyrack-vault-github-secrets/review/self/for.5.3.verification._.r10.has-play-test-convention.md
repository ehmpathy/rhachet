# self-review: has-play-test-convention (r10)

## question

> are journey test files named correctly?

## analysis

### test file inventory

found test files for this feature:

| file | type |
|------|------|
| `ghSecretSet.integration.test.ts` | integration test |
| `ghSecretDelete.integration.test.ts` | integration test |
| `vaultAdapterGithubSecrets.integration.test.ts` | integration test |

### journey test check

searched for `.play.test.ts` files:

```
$ find src/domain.operations/keyrack/adapters/vaults/github.secrets -name '*.play.*.ts'
(no results)
```

no journey tests exist for this feature.

### why no journey tests

this is consistent with r5 (has-journey-tests-from-repros):
- no repros artifact exists
- behavior route skipped from research (3.1) to blueprint (3.3)
- no user journey sketches were created
- behaviors specified directly in criteria

journey tests derive from repros. no repros means no journey tests to name.

### codebase convention

checked for `.play.test.ts` convention in codebase:

```
$ find src -name '*.play.*.ts' | head -5
(no results)
```

this codebase does not appear to use the `.play.test.ts` convention.

### test file location

all test files are collocated with source:

```
src/domain.operations/keyrack/adapters/vaults/github.secrets/
├── ghSecretDelete.ts
├── ghSecretDelete.integration.test.ts    ← collocated
├── ghSecretSet.ts
├── ghSecretSet.integration.test.ts       ← collocated
├── vaultAdapterGithubSecrets.ts
└── vaultAdapterGithubSecrets.integration.test.ts  ← collocated
```

follows standard collocation pattern — tests next to source.

### the relationship: repros → journey tests → .play.test.ts convention

```
repros artifact
  └─ sketches user journeys
     └─ journey tests capture these journeys
        └─ .play.test.ts suffix identifies journey tests
```

for this feature:
- no repros artifact (route skipped 3.1 → 3.3)
- therefore no user journey sketches
- therefore no journey tests
- therefore no files that should have `.play.test.ts` suffix

### what tests exist instead

the integration tests verify domain operation correctness:
- `ghSecretSet.integration.test.ts` — verifies gh CLI invocation for set
- `ghSecretDelete.integration.test.ts` — verifies gh CLI invocation for delete
- `vaultAdapterGithubSecrets.integration.test.ts` — verifies vault adapter interface

these are not journey tests. they are component tests that verify internal contracts.

journey tests would capture user journeys like:
- "user sets GITHUB_TOKEN via keyrack CLI"
- "user deletes secret via keyrack del command"

such tests would live at the CLI contract level, not the domain operation level.

### why convention does not apply

the `.play.test.ts` convention identifies journey tests derived from repros.

| condition | this feature |
|-----------|--------------|
| repros artifact exists | no |
| journey tests created | no |
| `.play.test.ts` files needed | no |

the convention is correctly not applied because there are no journey tests to apply it to.

## why it holds

1. **no repros artifact** — behavior route skipped from research to blueprint
2. **no journey tests** — journeys derive from repros; no repros means no journeys
3. **tests are integration tests** — verify internal contracts, not user journeys
4. **convention not applicable** — `.play.test.ts` is for journey tests; none exist
5. **logic chain valid** — r5 documented no repros; this is consistent

## verdict

**holds (n/a)** — no journey tests exist; `.play.test.ts` convention does not apply

