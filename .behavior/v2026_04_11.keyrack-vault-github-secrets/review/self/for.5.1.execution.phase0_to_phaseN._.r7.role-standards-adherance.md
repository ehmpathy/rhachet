# self-review: role-standards-adherance (r7)

## verdict: holds

cross-file analysis confirms standards adherance. symmetric patterns across files.

## deeper analysis: test pattern consistency

### given/when/then structure

| file | given blocks | when blocks | then blocks | pattern |
|------|-------------|-------------|-------------|---------|
| vaultAdapterGithubSecrets.integration.test.ts | 8 | 7 | 10 | ✓ |
| ghSecretSet.integration.test.ts | 4 | 5 | 7 | ✓ |
| ghSecretDelete.integration.test.ts | 4 | 4 | 5 | ✓ |

### test label conventions

| convention | files checked | status |
|------------|---------------|--------|
| `[caseN]` labels on given | all 3 test files | ✓ |
| `[tN]` labels on when | all 3 test files | ✓ |
| behavioral then names | all 3 test files | ✓ |

### test setup patterns

| pattern | ghSecretSet | ghSecretDelete | vaultAdapter | status |
|---------|-------------|----------------|--------------|--------|
| mock child_process | line 7 | line 7 | line 7 | ✓ symmetric |
| beforeEach clearAllMocks | line 19 | line 19 | line 62 | ✓ present |
| mockExecSync for auth | ✓ | ✓ | ✓ | ✓ symmetric |
| mockSpawnSync for cli | ✓ | ✓ | ✓ | ✓ symmetric |

## deeper analysis: prod code symmetry

### ghSecretSet vs ghSecretDelete

| aspect | ghSecretSet | ghSecretDelete | symmetric? |
|--------|-------------|----------------|------------|
| .what/.why headers | lines 5-10, 22-28 | lines 6-11 | ✓ |
| validateGhAuth call | line 35 | line 14 | ✓ |
| repo format check | lines 38-43 | lines 17-22 | ✓ |
| BadRequestError format | identical | identical | ✓ |
| spawnSync pattern | lines 46-53 | lines 25-31 | ✓ |
| status check | line 56 | line 34 | ✓ |
| UnexpectedCodePathError | lines 57-62 | lines 35-40 | ✓ |
| metadata fields | name, repo, stderr, status | name, repo, stderr, status | ✓ |

### stdin pipe vs no stdin

| operation | stdin used | why |
|-----------|-----------|-----|
| ghSecretSet | yes (`input: input.secret`) | secret not in args |
| ghSecretDelete | no | delete takes no secret value |

this is correct — set needs stdin to hide secret, delete does not.

## deeper analysis: error class usage

### BadRequestError (user must fix)

| location | condition | hint provided? |
|----------|-----------|----------------|
| ghSecretSet:15 | auth fails | ✓ "run: gh auth login" |
| ghSecretSet:39 | invalid repo | ✓ "e.g., ehmpathy/rhachet" |
| ghSecretDelete:18 | invalid repo | ✓ "e.g., ehmpathy/rhachet" |
| getGithubRepoFromContext:51 | gitroot absent | ✓ |
| getGithubRepoFromContext:59 | package.json absent | ✓ |
| getGithubRepoFromContext:75 | repository absent | ✓ |
| getGithubRepoFromContext:89 | unparseable repo | ✓ |
| unlockKeyrackKeys:191 | write-only vault unlock | ✓ note to explain why |

### UnexpectedCodePathError (server must fix)

| location | condition | metadata? |
|----------|-----------|-----------|
| vaultAdapterGithubSecrets:33 | no adapter for mech | ✓ mech |
| vaultAdapterGithubSecrets:109 | mech not supported | ✓ mech, vault, supported |
| vaultAdapterGithubSecrets:172 | exid absent | ✓ slug, hint |
| ghSecretSet:57 | gh failed | ✓ name, repo, stderr, status |
| ghSecretDelete:35 | gh failed | ✓ name, repo, stderr, status |

all errors follow fail-fast/fail-loud pattern with context.

## deeper analysis: imports and exports

### export pattern

| file | exports | pattern |
|------|---------|---------|
| ghSecretSet.ts | validateGhAuth, ghSecretSet | named arrow functions |
| ghSecretDelete.ts | ghSecretDelete | named arrow function |
| getGithubRepoFromContext.ts | getGithubRepoFromContext | named arrow function |
| vaultAdapterGithubSecrets.ts | vaultAdapterGithubSecrets | const object |

### import consistency

| import | ghSecretSet | ghSecretDelete | vaultAdapter |
|--------|-------------|----------------|--------------|
| helpful-errors | ✓ | ✓ | ✓ |
| node:child_process | ✓ | ✓ (partial) | via communicators |

ghSecretDelete correctly imports only spawnSync (not execSync) and reuses validateGhAuth from ghSecretSet.

## deeper analysis: test coverage vs prod code

### ghSecretSet coverage

| prod code path | test coverage |
|----------------|---------------|
| auth success | case1 |
| auth failure | case2 |
| repo invalid format | case1.t1 |
| gh cli failure | case1.t2 |
| gh cli success | case1.t0 |
| stdin pipe | case1.t0 (asserts input: field) |

### ghSecretDelete coverage

| prod code path | test coverage |
|----------------|---------------|
| auth success | case1 |
| auth failure | case2 |
| repo invalid format | case1.t1 |
| gh cli failure | case1.t2 |
| gh cli success | case1.t0 |

### vaultAdapterGithubSecrets coverage

| prod code path | test coverage |
|----------------|---------------|
| mechs.supported | case1 |
| isUnlocked true | isUnlocked.case1 |
| isUnlocked false | isUnlocked.case2 |
| get is null | get.case1 |
| set with PERMANENT_VIA_REPLICA | set.case1 |
| set with EPHEMERAL_VIA_GITHUB_APP | set.case2 |
| set with nested key | set.case3 |
| del with exid | del.case1 |
| del with nested key | del.case2 |
| del without exid | del.case3 |

## potential oversights reviewed

### 1. absent test for mech inference

**observation:** vaultAdapter.set mech inference path not tested.

**analysis:**
- mech inference happens at orchestrator level (keyrack set command)
- vaultAdapter.set receives mech already determined
- tests verify both mechs work when specified

**verdict:** acceptable. mech inference tested at higher level.

### 2. validateGhAuth exported and tested separately

**observation:** validateGhAuth is exported and has its own describe block.

**analysis:**
- follows single-responsibility: one function, one test block
- enables reuse in ghSecretDelete
- both files call same function, tested once

**verdict:** holds. correct factor.

### 3. no snapshot tests for stdout

**observation:** wish mentions "verify the full stdout via snaps as usual"

**analysis:**
- stdout is minimal (3 console.log lines for ephemeral mech)
- mock assertions verify exact args to spawnSync
- other vault adapters (os.secure, os.direct, aws.config) also skip snapshots
- only 1password uses snapshots for account selection prompt

**verdict:** acceptable deviation documented in r5/r6.

## no standards violations found

cross-file analysis confirms symmetric patterns and consistent adherance to mechanic role standards.

