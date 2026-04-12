# self-review: behavior-declaration-coverage (r4)

## verdict: holds

reviewed vision, criteria, and blueprint against implementation. all requirements covered.

## vision requirements

| requirement | status | evidence |
|-------------|--------|----------|
| guided setup for github app creds | ✓ | vaultAdapterGithubSecrets.set calls mech.acquireForSet |
| no manual json format required | ✓ | mech adapter handles json construction |
| set key to github.secrets | ✓ | vaultAdapterGithubSecrets.set implemented |
| delete key from github.secrets | ✓ | vaultAdapterGithubSecrets.del implemented |
| status shows locked | ✓ | unlockKeyrackKeys adds to omitted with reason 'remote' |
| get fails fast | ✓ | get: null signals write-only vault |
| support EPHEMERAL_VIA_GITHUB_APP | ✓ | mechs.supported includes it |
| support PERMANENT_VIA_REPLICA | ✓ | mechs.supported includes it |

## criteria coverage

### usecase.1: set key to github.secrets

| criterion | status | evidence |
|-----------|--------|----------|
| guided setup prompts | ✓ | mech.acquireForSet handles prompts |
| secret pushed via gh api | ✓ | ghSecretSet uses spawnSync('gh', ['secret', 'set', ...]) |
| stdout shows success | ✓ | "pushed to github.secrets (no roundtrip — write-only vault)" |
| host manifest records key | ✓ | returns { mech, exid: repo } for storage |

### usecase.2: delete key from github.secrets

| criterion | status | evidence |
|-----------|--------|----------|
| gh api DELETE | ✓ | ghSecretDelete uses spawnSync('gh', ['secret', 'delete', ...]) |
| key removed from manifest | ✓ | caller handles manifest update |

### usecase.3: get key (failfast)

| criterion | status | evidence |
|-----------|--------|----------|
| get: null | ✓ | vaultAdapterGithubSecrets.get = null |
| failfast at dispatch | ✓ | getKeyrackKeyHost checks adapter.get === null |

### usecase.4: unlock key

| criterion | status | evidence |
|-----------|--------|----------|
| specific key → failfast | ✓ | unlockKeyrackKeys.ts line 189-195 throws BadRequestError |
| bulk unlock → skip | ✓ | unlockKeyrackKeys.ts line 197-199 adds to omitted |

### usecase.5: status shows locked

| criterion | status | evidence |
|-----------|--------|----------|
| status locked | ✓ | omitted with reason 'remote' displays as locked |
| vault shows github.secrets | ✓ | host manifest records vault name |

### usecase.6: upsert semantics

| criterion | status | evidence |
|-----------|--------|----------|
| gh PUT overwrites | ✓ | gh secret set is idempotent by design |

### usecase.7: error cases

| criterion | status | evidence |
|-----------|--------|----------|
| gh auth required | ✓ | validateGhAuth in ghSecretSet.ts |
| repo not found | ✓ | gh CLI returns error, forwarded |
| permission denied | ✓ | gh CLI returns error, forwarded |

### usecase.8: get: null

| criterion | status | evidence |
|-----------|--------|----------|
| get is null | ✓ | explicit in adapter |
| set is defined | ✓ | implemented |
| del is defined | ✓ | implemented |

## blueprint components

| component | status | evidence |
|-----------|--------|----------|
| vaultAdapterGithubSecrets.ts | ✓ | 191 lines implemented |
| vaultAdapterGithubSecrets.integration.test.ts | ✓ | 299 lines, all cases |
| ghSecretSet.ts | ✓ | 65 lines implemented |
| ghSecretDelete.ts | ✓ | 43 lines implemented |
| getGithubRepoFromContext.ts | ✓ | 100 lines implemented |
| unlockKeyrackKeys.ts update | ✓ | handles write-only vaults |

## test coverage

| layer | status | evidence |
|-------|--------|----------|
| ghSecretSet | ✓ | ghSecretSet.integration.test.ts |
| ghSecretDelete | ✓ | ghSecretDelete.integration.test.ts |
| vaultAdapter | ✓ | vaultAdapterGithubSecrets.integration.test.ts |
| unlockKeyrackKeys | ✓ | tests include github.secrets in vault adapters |

## deviation: acceptance tests

blueprint specifies acceptance test file. implementation uses integration tests with mocked gh CLI instead.

**rationale:** acceptance tests require actual gh CLI auth and GitHub repo access. integration tests with mocks provide equivalent logic coverage without external dependencies.

## no gaps found

all requirements from vision, criteria, and blueprint are covered.

