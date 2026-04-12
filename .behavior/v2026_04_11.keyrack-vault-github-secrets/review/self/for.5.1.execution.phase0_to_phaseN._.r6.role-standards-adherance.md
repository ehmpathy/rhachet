# self-review: role-standards-adherance (r6)

## verdict: holds

reviewed against mechanic role briefs. all standards followed.

## briefs directories checked

| directory | relevance |
|-----------|-----------|
| code.prod/evolvable.procedures | input-context pattern, arrow functions |
| code.prod/evolvable.domain.operations | get-set-gen verbs |
| code.prod/pitofsuccess.errors | failfast, failloud, helpful errors |
| code.prod/pitofsuccess.procedures | idempotent procedures |
| code.prod/readable.comments | what-why headers |
| code.prod/readable.narrative | no else branches |
| code.test/frames.behavior | given-when-then |
| lang.terms | no gerunds, order noun_adj |
| lang.tones | lowercase, no buzzwords |

## standard checks

### input-context pattern

| file | check | status |
|------|-------|--------|
| vaultAdapterGithubSecrets.ts:set | `(input: {...}, context?: ContextKeyrack)` | ✓ |
| vaultAdapterGithubSecrets.ts:del | `(input: {...})` | ✓ input only, no context needed |
| ghSecretSet.ts | `(input: {...})` | ✓ communicator, no context |
| ghSecretDelete.ts | `(input: {...})` | ✓ communicator, no context |
| getGithubRepoFromContext.ts | `(input: {...})` | ✓ |

### arrow functions only

| file | check | status |
|------|-------|--------|
| vaultAdapterGithubSecrets.ts | all functions are arrow | ✓ |
| ghSecretSet.ts | validateGhAuth and ghSecretSet are arrow | ✓ |
| ghSecretDelete.ts | ghSecretDelete is arrow | ✓ |
| getGithubRepoFromContext.ts | both functions are arrow | ✓ |

### what-why headers

| file | function | headers | status |
|------|----------|---------|--------|
| vaultAdapterGithubSecrets.ts:getMechAdapter | `.what` and `.why` | ✓ |
| vaultAdapterGithubSecrets.ts:vaultAdapter | `.what` and `.why` | ✓ |
| ghSecretSet.ts:validateGhAuth | `.what` and `.why` | ✓ |
| ghSecretSet.ts:ghSecretSet | `.what` and `.why` | ✓ |
| ghSecretDelete.ts:ghSecretDelete | `.what` and `.why` | ✓ |
| getGithubRepoFromContext.ts:parseRepoFromRepositoryField | `.what` and `.why` | ✓ |
| getGithubRepoFromContext.ts:getGithubRepoFromContext | `.what` and `.why` | ✓ |

### no else branches

| file | check | status |
|------|-------|--------|
| all files | no `else` keyword | ✓ early returns used |

### fail-fast with BadRequestError

| file | check | status |
|------|-------|--------|
| ghSecretSet.ts:15 | BadRequestError with hint | ✓ |
| ghSecretSet.ts:39 | BadRequestError with hint | ✓ |
| ghSecretDelete.ts:18 | BadRequestError with hint | ✓ |
| getGithubRepoFromContext.ts:51 | BadRequestError with hint | ✓ |
| getGithubRepoFromContext.ts:59 | BadRequestError with hint | ✓ |
| getGithubRepoFromContext.ts:75 | BadRequestError with hint | ✓ |
| getGithubRepoFromContext.ts:89 | BadRequestError with hint | ✓ |
| unlockKeyrackKeys.ts:191 | BadRequestError with note | ✓ |

### fail-loud with UnexpectedCodePathError

| file | check | status |
|------|-------|--------|
| vaultAdapterGithubSecrets.ts:33 | no adapter for mech | ✓ |
| vaultAdapterGithubSecrets.ts:109 | mech not supported | ✓ |
| vaultAdapterGithubSecrets.ts:172 | exid required | ✓ |
| ghSecretSet.ts:57 | gh secret set failed | ✓ |
| ghSecretDelete.ts:35 | gh secret delete failed | ✓ |

### given-when-then tests

| test file | pattern | status |
|-----------|---------|--------|
| vaultAdapterGithubSecrets.integration.test.ts | given/when/then from test-fns | ✓ |
| ghSecretSet.integration.test.ts | given/when/then | ✓ |
| ghSecretDelete.integration.test.ts | given/when/then | ✓ |

### no gerunds in code

| file | check | status |
|------|-------|--------|
| all files | no `-ing` nouns | ✓ (checked via hook) |

### lowercase comments

| file | check | status |
|------|-------|--------|
| all files | comments start lowercase | ✓ |

### idempotent operations

| operation | idempotency | status |
|-----------|-------------|--------|
| ghSecretSet | gh secret set is idempotent (upsert) | ✓ |
| ghSecretDelete | gh secret delete is idempotent (no-op if absent) | ✓ |
| vaultAdapterGithubSecrets.set | returns { mech, exid } for storage | ✓ |

### get-set-gen verbs

| function | pattern | status |
|----------|---------|--------|
| getGithubRepoFromContext | get* | ✓ |
| parseRepoFromRepositoryField | parse* (transformer) | ✓ |
| validateGhAuth | validate* (guard) | ✓ |
| ghSecretSet | *Set (communicator) | ✓ |
| ghSecretDelete | *Delete (communicator) | ✓ |

## potential issues reviewed

### 1. mocks in tests

**rule:** rule.forbid.remote-boundaries says unit tests must not cross remote boundaries

**implementation:** tests mock `node:child_process` and mech adapters

**analysis:**
- these are integration tests (.integration.test.ts)
- mocks are appropriate for integration tests that need to isolate behavior
- we mock the gh CLI to avoid real API calls
- this is consistent with other vault adapter tests

**verdict:** holds. integration tests can mock external dependencies.

### 2. secret in spawnSync input

**rule:** security best practice

**implementation:** secret passed via `{ input: secret }` stdin, not args

**analysis:** secret not visible in process args, correct pattern

**verdict:** holds. secure approach.

### 3. error metadata includes repo

**rule:** fail-loud with context

**implementation:** all errors include relevant metadata (repo, name, stderr)

**verdict:** holds. good observability.

## no violations found

all code follows mechanic role standards.

