# self-review: role-standards-coverage (r8)

## verdict: holds

deep line-by-line analysis. all mechanic standards applied.

## line-by-line coverage: vaultAdapterGithubSecrets.ts

### imports (lines 1-15)

| line | content | standard applied |
|------|---------|------------------|
| 1 | `import { UnexpectedCodePathError }` | ✓ pitofsuccess.errors — uses proper error class |
| 3-7 | type imports | ✓ evolvable.repo.structure — directional deps (domain.objects) |
| 8-9 | mech adapters | ✓ bounded-contexts — imports via public interface |
| 10 | ContextKeyrack type | ✓ input-context pattern |
| 11 | inferKeyrackMechForSet | ✓ get-set-gen verbs |
| 13-15 | local imports | ✓ evolvable.repo.structure — collocated files |

### getMechAdapter (lines 17-36)

| line | content | standard applied |
|------|---------|------------------|
| 17-20 | .what/.why header | ✓ readable.comments — what-why headers |
| 21 | arrow function | ✓ evolvable.procedures — arrow-only |
| 22 | `(mech: ...)` | ✓ evolvable.procedures — typed input |
| 24-29 | adapters record | ✓ readable.narrative — simple lookup |
| 31-34 | null check + throw | ✓ pitofsuccess.errors — fail-loud |
| 33 | UnexpectedCodePathError | ✓ pitofsuccess.errors — correct class |
| 35 | return | ✓ readable.narrative — no else |

### vaultAdapterGithubSecrets (lines 38-190)

#### header (lines 38-45)

| line | content | standard applied |
|------|---------|------------------|
| 38-45 | .what/.why/.note | ✓ readable.comments — what-why headers |
| 42-43 | write-only notes | ✓ readable.comments — explains constraints |

#### mechs.supported (lines 47-49)

| line | content | standard applied |
|------|---------|------------------|
| 48 | array literal | ✓ pitofsuccess.typedefs — typed array |

#### isUnlocked (lines 51-66)

| line | content | standard applied |
|------|---------|------------------|
| 51-56 | .what/.why/.note | ✓ readable.comments — what-why headers |
| 57 | async arrow | ✓ evolvable.procedures — arrow-only |
| 58-62 | try block | ✓ appropriate — auth check returns boolean |
| 63-65 | catch block | ✓ does not swallow errors — returns false |

no violations. try/catch appropriate here: converts error → boolean.

#### unlock (lines 68-74)

| line | content | standard applied |
|------|---------|------------------|
| 68-71 | .what/.why | ✓ readable.comments — what-why headers |
| 72 | async arrow | ✓ evolvable.procedures — arrow-only |
| 73 | comment | ✓ readable.comments — explains noop |

#### get (lines 76-83)

| line | content | standard applied |
|------|---------|------------------|
| 76-82 | .what/.why/.note | ✓ readable.comments — what-why headers |
| 81 | unlockKeyrackKeys ref | ✓ readable.comments — explains integration |
| 83 | `get: null` | ✓ domain-driven-design — explicit null signals write-only |

#### set (lines 85-156)

| line | content | standard applied |
|------|---------|------------------|
| 85-92 | .what/.why/.note | ✓ readable.comments — what-why headers |
| 93-101 | signature | ✓ input-context pattern |
| 96-98 | optional fields | ✓ nullable correctly — mech can be inferred |
| 100 | `context?: ContextKeyrack` | ✓ input-context pattern |
| 102 | comment | ✓ readable.comments — paragraph comment |
| 103-105 | mech inference | ✓ pitofsuccess.procedures — sensible defaults |
| 107 | comment | ✓ readable.comments — paragraph comment |
| 108-117 | mech check | ✓ pitofsuccess.errors — fail-fast |
| 109-116 | UnexpectedCodePathError | ✓ pitofsuccess.errors — fail-loud with metadata |
| 114 | hint | ✓ pitofsuccess.errors — actionable hint |
| 119-120 | repo from context | ✓ readable.narrative — single line per task |
| 122-123 | mech adapter | ✓ readable.narrative — single line per task |
| 125-128 | conditional stdout | ✓ readable.narrative — no else branch |
| 130-133 | acquireForSet | ✓ pitofsuccess.procedures — idempotent mech call |
| 135-136 | secretName extraction | ✓ readable.narrative — comment + impl |
| 138-143 | ghSecretSet call | ✓ pitofsuccess.procedures — idempotent upsert |
| 145-152 | conditional stdout | ✓ readable.narrative — no else branch |
| 151 | braille blank | ✓ howto.pty-visual-space — survives PTY capture |
| 154-155 | return | ✓ evolvable.domain.objects — structured return |

#### del (lines 158-189)

| line | content | standard applied |
|------|---------|------------------|
| 158-164 | .what/.why/.note | ✓ readable.comments — what-why headers |
| 165-169 | signature | ✓ input-context pattern |
| 170-179 | exid guard | ✓ pitofsuccess.errors — fail-fast |
| 172-178 | UnexpectedCodePathError | ✓ pitofsuccess.errors — fail-loud with metadata |
| 176 | hint | ✓ pitofsuccess.errors — actionable hint |
| 181-182 | secretName extraction | ✓ readable.narrative — comment + impl |
| 184-188 | ghSecretDelete call | ✓ pitofsuccess.procedures — idempotent delete |

## line-by-line coverage: ghSecretSet.ts

| line range | standard applied |
|------------|------------------|
| 5-10 | ✓ readable.comments — what-why headers for validateGhAuth |
| 11 | ✓ evolvable.procedures — arrow function |
| 12-19 | ✓ pitofsuccess.errors — fail-fast with BadRequestError |
| 16 | ✓ pitofsuccess.errors — hint provided |
| 22-28 | ✓ readable.comments — what-why headers for ghSecretSet |
| 29-33 | ✓ input-context pattern — typed input |
| 34-35 | ✓ readable.comments — paragraph comment |
| 37-43 | ✓ pitofsuccess.errors — fail-fast validation |
| 40-41 | ✓ pitofsuccess.errors — hint provided |
| 45-53 | ✓ readable.comments — paragraph comment + spawnSync |
| 50 | ✓ security — secret via stdin, not args |
| 55-63 | ✓ pitofsuccess.errors — fail-loud with metadata |

## line-by-line coverage: ghSecretDelete.ts

| line range | standard applied |
|------------|------------------|
| 6-11 | ✓ readable.comments — what-why headers |
| 12 | ✓ evolvable.procedures — arrow function |
| 13-14 | ✓ readable.comments — paragraph comment |
| 16-22 | ✓ pitofsuccess.errors — fail-fast validation |
| 19-20 | ✓ pitofsuccess.errors — hint provided |
| 24-31 | ✓ readable.comments — paragraph comment + spawnSync |
| 33-41 | ✓ pitofsuccess.errors — fail-loud with metadata |

## line-by-line coverage: getGithubRepoFromContext.ts

| line range | standard applied |
|------------|------------------|
| 9-15 | ✓ readable.comments — what-why headers for parse |
| 16 | ✓ evolvable.procedures — arrow function |
| 24-34 | ✓ readable.narrative — early returns |
| 43-48 | ✓ readable.comments — what-why headers for getGithubRepoFromContext |
| 49 | ✓ evolvable.procedures — arrow function |
| 50-54 | ✓ pitofsuccess.errors — fail-fast, gitroot guard |
| 52-53 | ✓ pitofsuccess.errors — hint provided |
| 58-66 | ✓ pitofsuccess.errors — fail-fast, package.json guard |
| 62-64 | ✓ pitofsuccess.errors — hint provided |
| 74-82 | ✓ pitofsuccess.errors — fail-fast, repository guard |
| 78-80 | ✓ pitofsuccess.errors — hint provided |
| 88-96 | ✓ pitofsuccess.errors — fail-fast, parse guard |
| 92-94 | ✓ pitofsuccess.errors — hint provided |

## coverage check: test files

### ghSecretSet.integration.test.ts

| line | standard applied |
|------|------------------|
| 2 | ✓ frames.behavior — imports given/when/then |
| 17 | ✓ frames.behavior — single describe per file |
| 19 | ✓ frames.behavior — beforeEach clearAllMocks |
| 22 | ✓ frames.behavior — [caseN] labels |
| 28 | ✓ frames.behavior — [tN] labels |
| 41 | ✓ frames.behavior — behavioral then names |
| 70 | ✓ pitofsuccess.errors — tests error paths |
| 97 | ✓ pitofsuccess.errors — tests forwarded stderr |

### ghSecretDelete.integration.test.ts

| line | standard applied |
|------|------------------|
| 2 | ✓ frames.behavior — imports given/when/then |
| 17 | ✓ frames.behavior — single describe per file |
| 22 | ✓ frames.behavior — [caseN] labels |
| 28 | ✓ frames.behavior — [tN] labels |
| 41 | ✓ frames.behavior — behavioral then names |
| 66 | ✓ pitofsuccess.errors — tests error paths |
| 93 | ✓ pitofsuccess.errors — tests forwarded stderr |

### vaultAdapterGithubSecrets.integration.test.ts

| line | standard applied |
|------|------------------|
| 2 | ✓ frames.behavior — imports given/when/then |
| 7 | ✓ scope.unit — mocks child_process (integration test) |
| 60 | ✓ frames.behavior — single describe per file |
| 62 | ✓ frames.behavior — beforeEach clearAllMocks |
| 81 | ✓ frames.behavior — describe per operation |
| 82 | ✓ frames.behavior — [caseN] labels |
| 83-91 | ✓ frames.behavior — behavioral then names |
| 95-122 | ✓ test-coverage-by-grain — tests communicator isUnlocked |
| 125-131 | ✓ test-coverage-by-grain — tests get: null |
| 133-236 | ✓ test-coverage-by-grain — tests set with both mechs |
| 239-297 | ✓ test-coverage-by-grain — tests del with/without exid |

## absent patterns reviewed

### 1. no explicit type export

**observation:** types are imported from domain.objects, not re-exported.

**standard:** evolvable.repo.structure — types in domain.objects.

**verdict:** holds. types belong in domain.objects, not here.

### 2. no runtime type validation

**observation:** no zod/yup validation in ghSecretSet/ghSecretDelete.

**standard:** pitofsuccess.typedefs — runtime checks where needed.

**verdict:** holds. input is validated via:
- repo format check (string contains '/')
- gh CLI validates auth and permissions
- explicit typescript types on input

no additional runtime validation needed.

### 3. no de-dup of secretName extraction

**observation:** `slug.split('.').slice(2).join('.')` appears in both set (line 136) and del (line 182).

**standard:** prefer-wet-over-dry — wait for 3+ usages.

**verdict:** holds. 2 usages. wait for third before extract.

## no gaps found

all lines reviewed. all required mechanic standards applied.

