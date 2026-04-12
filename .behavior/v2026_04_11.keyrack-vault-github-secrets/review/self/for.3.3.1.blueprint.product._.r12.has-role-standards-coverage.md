# self-review: has-role-standards-coverage (r12)

## coverage check

check if blueprint includes all required patterns from mechanic standards.

---

## briefs directories to check for coverage

1. `code.prod/pitofsuccess.errors` — error handle patterns
2. `code.prod/pitofsuccess.procedures` — idempotency, validation
3. `code.test` — test types, coverage requirements
4. `code.prod/readable.comments` — .what/.why headers
5. `code.prod/readable.narrative` — early returns, no else

---

## check: error handle coverage

### rule.require.failfast

**required:** all error paths must failfast with clear messages

**blueprint declares:**
- get → failfast "github secrets cannot be retrieved via api" ✓
- unlock --key → failfast "github.secrets cannot be unlocked" ✓
- gh auth absent → failfast "gh auth required" ✓
- repo not found → failfast "repo not found" ✓
- permission denied → failfast "permission denied" ✓

**verdict:** all error paths covered with failfast.

### rule.require.failloud

**required:** errors must include actionable context

**blueprint declares:** error messages describe what went wrong and what is blocked

**verdict:** covered. messages are actionable.

---

## check: idempotency coverage

### rule.require.idempotent-procedures

**required:** mutations must be idempotent

**blueprint declares:**
- set → gh api PUT (upsert semantics) ✓
- del → gh api DELETE (idempotent by api design) ✓

**verdict:** covered. both mutations are idempotent.

---

## check: validation coverage

### rule.forbid.undefined-inputs

**required:** inputs must be explicitly defined

**blueprint declares:** validateSecretName for name validation

**question:** does blueprint cover all input validation?

**analysis:**
- secret name validation → validateSecretName ✓
- repo validation → implicit in gh api (returns 404) ✓
- auth validation → validateGhAuth ✓

**verdict:** covered. all inputs validated.

---

## check: test coverage patterns

### rule.require.test-coverage-by-grain

**required:** each grain has correct test type

| grain | required | blueprint declares |
|-------|----------|-------------------|
| transformer | unit | unit ✓ |
| communicator | integration | integration ✓ |
| orchestrator | integration | integration ✓ |
| contract | acceptance | acceptance ✓ |

**verdict:** all grains have correct test types.

### rule.require.snapshots

**required:** acceptance tests must snapshot outputs

**blueprint declares (lines 148-157):**
- set success snapshots ✓
- get failfast snapshot ✓
- del success snapshot ✓
- unlock failfast snapshot ✓
- status snapshot ✓
- error snapshots (3 cases) ✓

**verdict:** all contract outputs snapshotted.

---

## check: readable code patterns

### rule.require.what-why-headers

**required:** procedures must have .what/.why comments

**analysis:** this is implementation detail. blueprint does not declare comment headers. implementation must include them.

**verdict:** not a blueprint concern. implementation must cover.

### rule.forbid.else-branches

**required:** use early returns instead of else

**analysis:** this is implementation detail. blueprint declares codepaths but not control flow style.

**verdict:** not a blueprint concern. implementation must cover.

---

## patterns that could be absent

### validation transformer declared?

**check:** does blueprint declare validateSecretName with test cases?

**blueprint declares:**
- validateSecretName.ts (line 27)
- validateSecretName.test.ts (line 166)
- test cases: valid name, invalid chars, starts with number, GITHUB_* prefix, empty string (line 136)

**verdict:** covered.

### encryption transformer declared?

**check:** does blueprint declare encryptSecretValue with test cases?

**blueprint declares:**
- encryptSecretValue.ts (line 28)
- encryptSecretValue.test.ts (line 168)
- test cases: encrypt success, empty value (line 137)

**verdict:** covered.

### mock gh cli declared?

**check:** does blueprint declare mock gh cli extensions?

**blueprint declares (lines 257-275):**
- mock for secrets api set
- mock for secrets api delete
- mock for public key endpoint

**verdict:** covered.

---

## summary

| category | patterns required | covered? |
|----------|------------------|----------|
| error handle | failfast, failloud | yes |
| idempotency | upsert, idempotent delete | yes |
| validation | input validation | yes |
| test coverage | grain → test type | yes |
| snapshots | all outputs | yes |
| transformers | with unit tests | yes |
| mocks | gh cli extensions | yes |

**all required patterns are present in blueprint.**
