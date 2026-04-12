# self-review: has-consistent-conventions

## verdict: holds

reviewed name conventions and structure. all align with extant patterns.

## directory names

| vault | pattern |
|-------|---------|
| `1password` | external service name |
| `aws.config` | external service with dot separator |
| `github.secrets` | external service with dot separator ✓ |
| `os.*` | internal os-based with dot separator |

**verdict:** `github.secrets` follows same pattern as `aws.config`

## file names

### main adapter file

| vault | file |
|-------|------|
| os.secure | `vaultAdapterOsSecure.ts` |
| aws.config | `vaultAdapterAwsConfig.ts` |
| 1password | `vaultAdapter1Password.ts` |
| github.secrets | `vaultAdapterGithubSecrets.ts` ✓ |

**verdict:** follows `vaultAdapter{VaultName}.ts` pattern

### test files

| vault | files |
|-------|-------|
| os.secure | `vaultAdapterOsSecure.integration.test.ts` |
| aws.config | `vaultAdapterAwsConfig.integration.test.ts`, `.test.ts` |
| github.secrets | `vaultAdapterGithubSecrets.integration.test.ts` ✓ |

**verdict:** follows `{name}.integration.test.ts` pattern

### helper/communicator files

| vault | helper files |
|-------|--------------|
| 1password | `isOpCliInstalled.ts` |
| github.secrets | `ghSecretSet.ts`, `ghSecretDelete.ts`, `getGithubRepoFromContext.ts` |

**verdict:** acceptable — both vaults have separate helper files for distinct operations

## function names

| function | pattern | verdict |
|----------|---------|---------|
| `getMechAdapter` | per-vault local function | follows extant pattern |
| `ghSecretSet` | `{cli}{Action}` | follows verb pattern |
| `ghSecretDelete` | `{cli}{Action}` | follows verb pattern |
| `getGithubRepoFromContext` | `get{What}FromContext` | follows transformer pattern |
| `validateGhAuth` | `validate{What}` | follows validation pattern |
| `parseRepoFromRepositoryField` | `parse{What}From{Source}` | follows transformer pattern |

**verdict:** all follow established name conventions

## no divergence found

all names and structures align with extant patterns in the codebase.

