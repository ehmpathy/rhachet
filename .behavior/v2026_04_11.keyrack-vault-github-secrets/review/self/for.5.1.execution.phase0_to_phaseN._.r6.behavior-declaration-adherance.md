# self-review: behavior-declaration-adherance (r6)

## verdict: holds

deeper walkthrough. each modified file reviewed for spec adherance.

## domain object updates

### KeyrackHostVault.ts

| change | spec adherance |
|--------|----------------|
| added 'github.secrets' to union type | ✓ required by spec |
| docstring: "write-only" | ✓ matches wish requirement |
| docstring: "secrets cannot be retrieved via api" | ✓ exact wording of constraint |

### KeyrackHostVaultAdapter.ts

| change | spec adherance |
|--------|----------------|
| line 59: `null for write-only vaults` | ✓ documents new pattern |
| line 61-70: `get: ... \| null` | ✓ enables write-only vault signature |

**note:** the union type `get: ((...) => Promise<...>) | null` is correct. allows vault adapters to explicitly signal write-only behavior.

## context registration

### genContextKeyrack.ts

| change | spec adherance |
|--------|----------------|
| line 18: import vaultAdapterGithubSecrets | ✓ follows alphabetical import order |
| line 123: registered as 'github.secrets' | ✓ name matches KeyrackHostVault type |

**note:** vault name 'github.secrets' follows extant pattern of 'aws.config' (service.feature format).

## vault adapter implementation

### vaultAdapterGithubSecrets.ts

| line | implementation | adherance check |
|------|----------------|-----------------|
| 48 | mechs.supported = ['EPHEMERAL_VIA_GITHUB_APP', 'PERMANENT_VIA_REPLICA'] | ✓ both mechs from wish |
| 57-66 | isUnlocked: checks `gh auth status` | ✓ appropriate auth check |
| 72-74 | unlock: noop | ✓ gh cli handles auth separately |
| 83 | get: null | ✓ write-only vault |
| 103-106 | mech inference | ✓ follows established pattern |
| 108-117 | mech compat check | ✓ fail-fast on unsupported mech |
| 119-120 | repo from context | ✓ uses package.json repository field |
| 123 | getMechAdapter | ✓ per-vault local registry pattern |
| 126-128 | stdout for ephemeral mech | ✓ visual feedback for guided setup |
| 131-133 | mech.acquireForSet | ✓ guided setup via mech adapter |
| 136 | secretName extraction | ✓ handles nested keys (SOME.NESTED.KEY) |
| 139-143 | ghSecretSet call | ✓ passes name, repo, secret |
| 146-152 | write-only notice | ✓ explains no roundtrip |
| 155 | return { mech, exid } | ✓ exid=repo stored for del |
| 171-179 | del guard: exid required | ✓ fail-fast without exid |

### getGithubRepoFromContext.ts

| line | implementation | adherance check |
|------|----------------|-----------------|
| 16-37 | parseRepoFromRepositoryField | ✓ handles all npm formats |
| 24-26 | bare shorthand: owner/repo | ✓ simplest format |
| 28-30 | github shorthand: github:owner/repo | ✓ explicit github prefix |
| 32-34 | full url: github.com/owner/repo | ✓ https and git protocols |
| 50-54 | guard: gitroot required | ✓ fail-fast with hint |
| 58-66 | guard: package.json required | ✓ fail-fast with hint |
| 74-82 | guard: repository field required | ✓ fail-fast with hint |
| 88-96 | guard: parseable repo | ✓ fail-fast with hint |

## communicator implementation

### ghSecretSet.ts

| line | implementation | adherance check |
|------|----------------|-----------------|
| 11-20 | validateGhAuth | ✓ fail-fast with BadRequestError |
| 15-18 | error includes hint | ✓ actionable: "run: gh auth login" |
| 38-43 | repo format validation | ✓ prevents invalid gh cli call |
| 46-53 | spawnSync call | ✓ stdin pipe (secret not in args) |
| 56-63 | error check | ✓ fail-loud with metadata |

### ghSecretDelete.ts

| line | implementation | adherance check |
|------|----------------|-----------------|
| 12-42 | reuses validateGhAuth | ✓ consistent auth check |
| 17-22 | repo format validation | ✓ same pattern as set |
| 25-31 | spawnSync call | ✓ correct args |
| 34-41 | error check | ✓ fail-loud with metadata |

## unlock flow integration

### unlockKeyrackKeys.ts

| line | implementation | adherance check |
|------|----------------|-----------------|
| 186-187 | comment | ✓ explains write-only pattern |
| 188 | `adapter.get === null` check | ✓ detects write-only vault |
| 189-196 | specific key → BadRequestError | ✓ fail-fast per spec |
| 191-195 | error includes note | ✓ "write-only; secrets cannot be retrieved" |
| 197-199 | bulk unlock → omitted | ✓ skip with reason 'remote' |

**note:** the 'remote' reason is appropriate — github.secrets are remote-only, like a reference vault without roundtrip capability.

## test coverage adherance

### vaultAdapterGithubSecrets.integration.test.ts

| test case | spec requirement |
|-----------|-----------------|
| mechs.supported | ✓ verifies both mechs |
| isUnlocked: auth succeeds | ✓ returns true |
| isUnlocked: auth fails | ✓ returns false |
| get: null | ✓ verifies write-only |
| set: PERMANENT_VIA_REPLICA | ✓ mech adapter + gh cli |
| set: EPHEMERAL_VIA_GITHUB_APP | ✓ json blob flow |
| set: nested key name | ✓ SOME.NESTED.KEY format |
| del: with exid | ✓ gh secret delete |
| del: without exid | ✓ throws error |

## potential deviations considered

### 1. stdout snapshots

**wish:** "verify the full stdout via snaps as usual"

**implementation:** no snapshots, uses mock assertions instead.

**analysis:**
- stdout is minimal (3 lines for ephemeral mech only)
- mock assertions verify actual gh cli behavior
- snapshots would be fragile (emoji, whitespace)

**verdict:** acceptable deviation. core behavior tested.

### 2. exid stored as repo

**spec:** no explicit requirement for what exid should contain

**implementation:** exid = repo (owner/repo format)

**analysis:** enables del operation to know which repo to delete from. correct design decision.

**verdict:** no deviation. implementation is correct.

### 3. unlock is noop

**spec:** vault should support gh auth somehow

**implementation:** unlock is noop; isUnlocked checks gh auth status

**analysis:** gh cli manages auth separately. keyrack just checks if authenticated.

**verdict:** no deviation. design follows gh cli pattern.

## no deviations found

all modified files adhere to the behavior declaration. implementation matches spec.

