# self-review: has-consistent-mechanisms (r3)

## verdict: holds

deeper review with additional search patterns. no duplication found.

## additional searches

### spawnSync usage

searched for `spawnSync` across codebase:
- 89 files use spawnSync
- no shared wrapper/helper for spawnSync calls
- each module uses spawnSync directly for its domain

**verdict:** consistent — direct spawnSync usage is the established pattern

### gh auth status duplication check

found two uses within github.secrets:
1. `vaultAdapterGithubSecrets.ts:isUnlocked` — returns boolean
2. `ghSecretSet.ts:validateGhAuth` — throws error on failure

**analysis:**
- different return types: boolean vs void (throws)
- different semantics: check vs fail-fast
- cannot directly reuse: `isUnlocked` catches exception, `validateGhAuth` throws

**verdict:** not duplication — distinct behaviors required by their contexts

### execSync patterns

searched for `execSync.*auth` patterns:
- only in new github.secrets files
- no extant gh auth patterns

**verdict:** first gh cli integration — no extant pattern to reuse

## summary of all mechanism reviews

| mechanism | status | rationale |
|-----------|--------|-----------|
| getMechAdapter | consistent | follows established per-vault local registry pattern |
| validateGhAuth | new domain | first gh cli in keyrack, no extant pattern |
| ghSecretSet | new domain | first gh secret operations, no extant pattern |
| ghSecretDelete | new domain | first gh secret operations, no extant pattern |
| getGithubRepoFromContext | distinct | different from getOrgFromPackageJson (full repo vs org) |
| isUnlocked + validateGhAuth | distinct | different return types and semantics |

no duplication found.

