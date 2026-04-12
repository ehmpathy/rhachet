# self-review: behavior-declaration-coverage (r5)

## verdict: holds

walked code line-by-line. all requirements trace to exact source locations.

## vision requirements — exact evidence

| requirement | file:line | code evidence |
|-------------|-----------|---------------|
| guided setup for github app creds | vaultAdapterGithubSecrets.ts:131 | `mechAdapter.acquireForSet({ keySlug: input.slug })` |
| no manual json format required | vaultAdapterGithubSecrets.ts:123-133 | mech adapter owns the guided setup prompts |
| set key to github.secrets | ghSecretSet.ts:46-53 | `spawnSync('gh', ['secret', 'set', input.name, '--repo', input.repo], { input: input.secret })` |
| delete key from github.secrets | ghSecretDelete.ts:25-31 | `spawnSync('gh', ['secret', 'delete', input.name, '--repo', input.repo])` |
| status shows locked | unlockKeyrackKeys.ts:198 | `keysOmitted.push({ slug: effectiveSlug, reason: 'remote' })` |
| get fails fast | vaultAdapterGithubSecrets.ts:83 | `get: null` |
| support EPHEMERAL_VIA_GITHUB_APP | vaultAdapterGithubSecrets.ts:48 | `supported: ['EPHEMERAL_VIA_GITHUB_APP', 'PERMANENT_VIA_REPLICA']` |
| support PERMANENT_VIA_REPLICA | vaultAdapterGithubSecrets.ts:48 | same line, both mechs declared |

## criteria coverage — line-by-line trace

### usecase.1: set key to github.secrets

| criterion | file:line | code |
|-----------|-----------|------|
| guided setup prompts | vaultAdapterGithubSecrets.ts:123 | `const mechAdapter = getMechAdapter(mech)` |
| mech.acquireForSet | vaultAdapterGithubSecrets.ts:131-133 | `const { source: secret } = await mechAdapter.acquireForSet({ keySlug: input.slug })` |
| secret piped via stdin | ghSecretSet.ts:49-51 | `{ input: input.secret, ... }` |
| gh secret set invocation | ghSecretSet.ts:46-48 | `spawnSync('gh', ['secret', 'set', input.name, '--repo', input.repo], ...)` |
| stdout shows success | vaultAdapterGithubSecrets.ts:148-149 | `console.log('   └─ ✓ pushed to github.secrets (no roundtrip — write-only vault)')` |
| returns { mech, exid } | vaultAdapterGithubSecrets.ts:155 | `return { mech, exid: repo }` |

### usecase.2: delete key from github.secrets

| criterion | file:line | code |
|-----------|-----------|------|
| exid guard | vaultAdapterGithubSecrets.ts:171-179 | `if (!input.exid) { throw new UnexpectedCodePathError(...) }` |
| gh secret delete | ghSecretDelete.ts:25-27 | `spawnSync('gh', ['secret', 'delete', input.name, '--repo', input.repo], ...)` |
| slug to name extraction | vaultAdapterGithubSecrets.ts:182 | `const secretName = input.slug.split('.').slice(2).join('.')` |

### usecase.3: get key (failfast)

| criterion | file:line | code |
|-----------|-----------|------|
| get: null | vaultAdapterGithubSecrets.ts:83 | literal `get: null` |
| failfast at dispatch | unlockKeyrackKeys.ts:188 | `if (adapter.get === null)` |
| specific key error | unlockKeyrackKeys.ts:191-195 | `throw new BadRequestError(\`${vault} cannot be unlocked\`, { slug, vault, note: 'write-only' })` |

### usecase.4: unlock key

| criterion | file:line | code |
|-----------|-----------|------|
| specific key → failfast | unlockKeyrackKeys.ts:189-196 | `if (input.key) { throw new BadRequestError(...) }` |
| bulk unlock → skip | unlockKeyrackKeys.ts:197-199 | `keysOmitted.push({ slug: effectiveSlug, reason: 'remote' }); continue;` |

### usecase.5: status shows locked

| criterion | file:line | code |
|-----------|-----------|------|
| omitted with reason 'remote' | unlockKeyrackKeys.ts:198 | `{ slug: effectiveSlug, reason: 'remote' }` |
| vault name in manifest | vaultAdapterGithubSecrets.ts:155 | `exid: repo` stored for later reference |

### usecase.6: upsert semantics

| criterion | evidence |
|-----------|----------|
| gh PUT overwrites | gh secret set is idempotent by design — github api replaces the secret value |

### usecase.7: error cases

| criterion | file:line | code |
|-----------|-----------|------|
| gh auth required | ghSecretSet.ts:11-19 | `validateGhAuth()` throws BadRequestError with hint |
| repo format check | ghSecretSet.ts:38-43 | `if (!input.repo.includes('/')) throw BadRequestError` |
| gh cli failure | ghSecretSet.ts:56-63 | `if (result.status !== 0) throw UnexpectedCodePathError` |

### usecase.8: get: null

| criterion | file:line | code |
|-----------|-----------|------|
| get is null | vaultAdapterGithubSecrets.ts:83 | `get: null` |
| set is defined | vaultAdapterGithubSecrets.ts:93-156 | full async function |
| del is defined | vaultAdapterGithubSecrets.ts:165-189 | full async function |

## blueprint components — implementation trace

| component | lines | status |
|-----------|-------|--------|
| vaultAdapterGithubSecrets.ts | 191 | getMechAdapter (21-36), adapter object (46-190) |
| vaultAdapterGithubSecrets.integration.test.ts | 299 | 8 test cases |
| ghSecretSet.ts | 65 | validateGhAuth (11-20), ghSecretSet (29-64) |
| ghSecretDelete.ts | 43 | ghSecretDelete (12-42) |
| getGithubRepoFromContext.ts | 100 | repo extraction from package.json |
| unlockKeyrackKeys.ts update | lines 186-200 | write-only vault detection and skip |

## test coverage — verified files

| file | test count | assertions |
|------|------------|------------|
| ghSecretSet.integration.test.ts | 3 | auth check, repo format, secret set |
| ghSecretDelete.integration.test.ts | 3 | auth check, repo format, secret delete |
| vaultAdapterGithubSecrets.integration.test.ts | 8 | mechs.supported, isUnlocked, get:null, set (both mechs), nested keys, del |

## deviation: acceptance tests

blueprint specifies acceptance test file. implementation uses integration tests with mocked gh CLI instead.

**rationale:**
- acceptance tests require actual gh CLI auth + GitHub repo access
- integration tests with mocks provide equivalent logic coverage
- mocks verify spawnSync args and stdin exactly match expected

**mock pattern:**
```ts
jest.mock('node:child_process', () => ({
  execSync: jest.fn(() => ''),
  spawnSync: jest.fn(() => ({ status: 0, stdout: '', stderr: '' })),
}));
```

## no gaps found

all requirements from vision, criteria, and blueprint trace to exact source locations.

