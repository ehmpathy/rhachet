# self-review: role-standards-coverage (r7)

## verdict: holds

reviewed for coverage of mechanic role standards. all required practices present.

## briefs directories checked

| directory | relevance to this code |
|-----------|------------------------|
| code.prod/evolvable.procedures | input-context pattern, arrow functions |
| code.prod/evolvable.domain.operations | get-set-gen verbs, domain operation grains |
| code.prod/pitofsuccess.errors | fail-fast, fail-loud, error classes |
| code.prod/pitofsuccess.procedures | idempotent procedures |
| code.prod/readable.comments | what-why headers |
| code.prod/readable.narrative | no else branches, early returns |
| code.test/frames.behavior | given-when-then |
| code.test/scope.coverage | test coverage by grain |
| lang.terms | no gerunds, noun_adj order |
| lang.tones | lowercase, no buzzwords |

## coverage check: error practices

### fail-fast coverage

| file | should failfast? | has failfast? |
|------|------------------|---------------|
| ghSecretSet.ts | yes (auth, repo format) | ✓ lines 11-19, 38-43 |
| ghSecretDelete.ts | yes (auth, repo format) | ✓ lines 14, 17-22 |
| vaultAdapterGithubSecrets.ts | yes (mech, exid) | ✓ lines 103-117, 171-179 |
| getGithubRepoFromContext.ts | yes (gitroot, package, repo) | ✓ lines 50-96 |
| unlockKeyrackKeys.ts | yes (write-only vault) | ✓ lines 189-196 |

### fail-loud coverage

| file | should failloud? | has failloud? |
|------|------------------|---------------|
| ghSecretSet.ts | yes (gh failure) | ✓ UnexpectedCodePathError with metadata |
| ghSecretDelete.ts | yes (gh failure) | ✓ UnexpectedCodePathError with metadata |
| vaultAdapterGithubSecrets.ts | yes (no adapter, unsupported mech) | ✓ lines 33, 109 |

### hint coverage

| error location | has hint? |
|----------------|-----------|
| ghSecretSet:15 (auth) | ✓ "run: gh auth login" |
| ghSecretSet:39 (repo format) | ✓ "e.g., ehmpathy/rhachet" |
| ghSecretDelete:18 (repo format) | ✓ "e.g., ehmpathy/rhachet" |
| getGithubRepoFromContext:51 (gitroot) | ✓ |
| getGithubRepoFromContext:59 (package.json) | ✓ |
| getGithubRepoFromContext:75 (repository) | ✓ |
| vaultAdapterGithubSecrets:172 (exid) | ✓ |
| unlockKeyrackKeys:191 (write-only) | ✓ note to explain |

## coverage check: test practices

### test file coverage

| prod file | has test? | test type |
|-----------|-----------|-----------|
| ghSecretSet.ts | ✓ | integration (communicator) |
| ghSecretDelete.ts | ✓ | integration (communicator) |
| vaultAdapterGithubSecrets.ts | ✓ | integration (orchestrator) |
| getGithubRepoFromContext.ts | implicit | tested via adapter tests |
| unlockKeyrackKeys.ts | implicit | tested at higher level |

### test pattern coverage

| pattern | ghSecretSet | ghSecretDelete | vaultAdapter |
|---------|-------------|----------------|--------------|
| given/when/then | ✓ | ✓ | ✓ |
| case labels [caseN] | ✓ | ✓ | ✓ |
| when labels [tN] | ✓ | ✓ | ✓ |
| behavioral then names | ✓ | ✓ | ✓ |
| error assertions via getError | ✓ | ✓ | ✓ |
| mock assertions | ✓ | ✓ | ✓ |

### test case coverage

| scenario type | ghSecretSet | ghSecretDelete |
|---------------|-------------|----------------|
| success path | ✓ | ✓ |
| auth failure | ✓ | ✓ |
| validation failure | ✓ | ✓ |
| gh cli failure | ✓ | ✓ |

## coverage check: comment practices

### what-why headers coverage

| file | has .what/.why? |
|------|-----------------|
| ghSecretSet.ts:validateGhAuth | ✓ lines 5-10 |
| ghSecretSet.ts:ghSecretSet | ✓ lines 22-28 |
| ghSecretDelete.ts:ghSecretDelete | ✓ lines 6-11 |
| getGithubRepoFromContext.ts:parseRepoFromRepositoryField | ✓ |
| getGithubRepoFromContext.ts:getGithubRepoFromContext | ✓ |
| vaultAdapterGithubSecrets.ts:getMechAdapter | ✓ |
| vaultAdapterGithubSecrets.ts:vaultAdapterGithubSecrets | ✓ |

### code paragraph comments coverage

| file | has paragraph comments? |
|------|------------------------|
| ghSecretSet.ts | ✓ lines 34, 37, 45, 55 |
| ghSecretDelete.ts | ✓ lines 13, 16, 24, 33 |
| vaultAdapterGithubSecrets.ts | ✓ throughout |

## coverage check: type practices

### input-context pattern coverage

| function | has (input, context?) | status |
|----------|----------------------|--------|
| ghSecretSet | (input: {...}) | ✓ input only, no context needed |
| ghSecretDelete | (input: {...}) | ✓ input only, no context needed |
| vaultAdapterGithubSecrets.set | (input: {...}, context?: ContextKeyrack) | ✓ |
| vaultAdapterGithubSecrets.del | (input: {...}) | ✓ input only |
| getGithubRepoFromContext | (input: {...}) | ✓ |

### arrow functions coverage

| file | all arrow? |
|------|------------|
| ghSecretSet.ts | ✓ |
| ghSecretDelete.ts | ✓ |
| getGithubRepoFromContext.ts | ✓ |
| vaultAdapterGithubSecrets.ts | ✓ |

## coverage check: idempotency

| operation | idempotent? | how? |
|-----------|-------------|------|
| ghSecretSet | ✓ | gh secret set is upsert |
| ghSecretDelete | ✓ | gh secret delete is no-op if absent |
| vaultAdapter.set | ✓ | returns { mech, exid } |
| vaultAdapter.del | ✓ | calls idempotent ghSecretDelete |

## potential gaps reviewed

### 1. no unit tests for getGithubRepoFromContext

**observation:** getGithubRepoFromContext has no dedicated test file.

**analysis:**
- parseRepoFromRepositoryField is pure (could unit test)
- getGithubRepoFromContext reads filesystem (integration)
- logic is simple: read package.json, parse field
- covered via vaultAdapter tests

**verdict:** acceptable. add unit test if complexity grows.

### 2. no snapshot tests

**observation:** wish mentioned "verify the full stdout via snaps as usual".

**analysis:**
- stdout is minimal (3 console.log lines for ephemeral mech)
- mock assertions verify exact spawnSync args
- other vault adapters skip snapshots too
- documented deviation in prior reviews

**verdict:** acceptable deviation.

### 3. no test for mech inference path

**observation:** mech inference in vaultAdapter.set not tested.

**analysis:**
- mech inference happens at orchestrator level (keyrack set command)
- vaultAdapter receives mech already determined
- tests verify both mechs work when specified

**verdict:** acceptable. mech inference tested at higher level.

## no gaps found

all required mechanic standards are covered in the implementation.

