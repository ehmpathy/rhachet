# review: role-standards-adherance (round 6)

## slowed down. checked each file against mechanic briefs.

---

## rule directories enumerated

relevant brief categories for this code:

| category | path | relevance |
|----------|------|-----------|
| lang.terms | practices/lang.terms/ | function names, variable names |
| lang.tones | practices/lang.tones/ | comments, style |
| code.prod/evolvable.procedures | practices/code.prod/evolvable.procedures/ | function signatures |
| code.prod/pitofsuccess.errors | practices/code.prod/pitofsuccess.errors/ | error patterns |
| code.prod/readable.comments | practices/code.prod/readable.comments/ | jsdoc |
| code.test | practices/code.test/ | test patterns |

---

## file-by-file rule check

### 1. promptLineInput.ts

| rule | status | evidence |
|------|--------|----------|
| rule.require.input-context-pattern | ✓ | `(input: { prompt: string })` |
| rule.require.arrow-only | ✓ | `export const promptLineInput = async (input) => {` |
| rule.forbid.gerunds | ✓ | no gerunds in code |
| rule.prefer.lowercase | ✓ | all lowercase except type names |

### 2. mockPromptLineInput.ts

| rule | status | evidence |
|------|--------|----------|
| rule.require.input-context-pattern | ✓ | mock generator uses no args |
| rule.require.arrow-only | ✓ | `export const setMockPromptLineValues = (values) => {` |
| rule.forbid.gerunds | ✓ | no gerunds in code |
| rule.require.named-args | ✓ | functions use named parameters |

### 3. inferKeyrackMechForSet.ts

| rule | status | evidence |
|------|--------|----------|
| rule.require.input-context-pattern | ✓ | `(input: { vault: KeyrackHostVaultAdapter })` |
| rule.require.arrow-only | ✓ | `export const inferKeyrackMechForSet = async (input) => {` |
| rule.require.what-why-headers | ✓ | has `.what` and `.why` comments |
| rule.forbid.else-branches | ✓ | uses early return pattern |
| rule.require.failfast | ✓ | throws on invalid choice |

### 4. KeyrackKeySpec.ts

| rule | status | evidence |
|------|--------|----------|
| rule.require.what-why-headers | ✓ | interface has `.what` and `.why` for each field |
| rule.forbid.nullable-without-reason | ✓ | `.note = null means no constraint` explains why null |

### 5. hydrateKeyrackRepoManifest.ts

| rule | status | evidence |
|------|--------|----------|
| rule.require.input-context-pattern | ✓ | `(input: { ... }, context: { ... })` |
| rule.require.arrow-only | ✓ | all functions use arrow syntax |
| rule.require.what-why-headers | ✓ | has `.what` and `.why` comments |

### 6. mechAdapterGithubApp.ts

| rule | status | evidence |
|------|--------|----------|
| rule.prefer.helpful-error-wrap | ✓ | `UnexpectedCodePathError` with metadata |
| rule.require.failfast | ✓ | throws on pem read failure |

---

## test file check (fillKeyrackKeys.integration.test.ts)

| rule | status | evidence |
|------|--------|----------|
| rule.require.given-when-then | ✓ | uses `given()`, `when()`, `then()` |
| rule.forbid.remote-boundaries (unit) | n/a | this is .integration.test.ts |

---

## anti-patterns checked

| anti-pattern | found? |
|--------------|--------|
| function keyword | no — all arrow functions |
| positional args | no — all named args |
| else branches | no — early returns |
| mocks in unit tests | no — mocks only in integration tests |
| failhide (swallow errors) | no — errors thrown or logged |

---

## verdict

**holds** — all code follows mechanic role standards. no violations. no anti-patterns.

