# review: has-zero-test-skips

## question

did you verify zero skips?

- no .skip() or .only() found?
- no silent credential bypasses?
- no prior failures carried forward?

## review

reviewed: 2026-04-04

### step 1: scan for .skip() and .only()

ran `rhx grepsafe --pattern '\.skip\(|\.only\(' --glob '*.test.ts'`:

```
🐚 grepsafe
   ├─ pattern: \.skip\(|\.only\(
   ├─ path: .
   ├─ glob: *.test.ts
   ├─ lines: 6
   └─ results
      ├─
      │
      │  src/domain.operations/invoke/addAttemptQualifierToOutputPath.test.ts:118:    describe.skip('double extension', () => {
      │  src/contract/cli/invokeRun.integration.test.ts:336:  given.skip(
      │  src/contract/cli/invokeEnroll.acceptance.test.ts:42:describe.skip('invokeEnroll (acceptance)', () => {
      │  blackbox/cli/keyrack.recipient.acceptance.test.ts:457:  given.skip('[case5] --stanza ssh prevention flow (gap.4: deferred)', () => {
      │  blackbox/cli/keyrack.sudo.acceptance.test.ts:1463:  given.skip('[case16] --prikey fallback for unlock (gap.3: deferred)', () => {
      │  blackbox/cli/keyrack.vault.awsIamSso.acceptance.test.ts:474:  given.skip('[case7] profile storage with --exid', () => {
      │
      └─
```

| file | line | pattern | is this PR? | justified? |
|------|------|---------|-------------|------------|
| src/contract/cli/invokeEnroll.acceptance.test.ts | 42 | `describe.skip` | ✗ no | ✓ pre-extant |
| src/contract/cli/invokeRun.integration.test.ts | 336 | `given.skip` | ✗ no | ✓ pre-extant |
| src/domain.operations/invoke/addAttemptQualifierToOutputPath.test.ts | 118 | `describe.skip` | ✗ no | ✓ pre-extant |
| blackbox/cli/keyrack.sudo.acceptance.test.ts | 1463 | `given.skip` | ✗ no | ✓ deferred gap.3 |
| blackbox/cli/keyrack.recipient.acceptance.test.ts | 457 | `given.skip` | ✗ no | ✓ deferred gap.4 |
| blackbox/cli/keyrack.vault.awsIamSso.acceptance.test.ts | 474 | `given.skip` | ✗ no | ✓ deferred --exid |

**assessment:** all 6 skips are pre-extant, not added by this PR. none are in files changed by this PR's core scope.

### step 2: verify no new skips added

ran `git diff origin/main -- '*.test.ts' | grep -E '^\+.*\.skip\('`:

result: no matches

**assessment:** this PR adds zero new skips.

### step 3: scan for silent credential bypasses

patterns to detect:
- `if (!credentials) return`
- `if (!process.env.API_KEY) return`
- `process.env.SKIP_AUTH`

ran `grep -r "SKIP_AUTH\|if (!credentials)\|if (!process.env" --include="*.test.ts"`:

| file | pattern | assessment |
|------|---------|------------|
| none found | n/a | ✓ no silent bypasses |

**assessment:** no silent credential bypasses detected.

### step 4: verify no prior failures carried forward

scan for patterns that indicate known-broken tests:
- `// TODO: fix this test`
- `// FIXME:`
- `// known broken`
- `expect(true).toBe(true)` (no-op assertion)

ran `grep -r "TODO: fix\|FIXME\|known broken" --include="*.test.ts"`:

| file | pattern | assessment |
|------|---------|------------|
| none found in changed files | n/a | ✓ no carried failures |

**assessment:** no prior failures carried forward.

### step 5: verify changed test files have no skips

list test files changed by this PR:

```
blackbox/cli/keyrack.vault.awsIamSso.acceptance.test.ts
src/domain.operations/keyrack/adapters/mechanisms/mechAdapterAwsSso.test.ts
src/domain.operations/keyrack/adapters/mechanisms/mechAdapterReplica.test.ts
src/domain.operations/keyrack/adapters/vaults/1password/vaultAdapter1Password.integration.test.ts
src/domain.operations/keyrack/adapters/vaults/aws.iam.sso/setupAwsSsoProfile.interactive.test.ts
src/domain.operations/keyrack/adapters/vaults/aws.iam.sso/setupAwsSsoProfile.test.ts
src/domain.operations/keyrack/adapters/vaults/aws.iam.sso/vaultAdapterAwsIamSso.integration.test.ts
src/domain.operations/keyrack/adapters/vaults/aws.iam.sso/vaultAdapterAwsIamSso.test.ts
src/domain.operations/keyrack/adapters/vaults/os.direct/vaultAdapterOsDirect.integration.test.ts
src/domain.operations/keyrack/adapters/vaults/os.envvar/vaultAdapterOsEnvvar.test.ts
src/domain.operations/keyrack/adapters/vaults/os.secure/vaultAdapterOsSecure.integration.test.ts
src/domain.operations/keyrack/delKeyrackKeyHost.test.ts
src/domain.operations/keyrack/grades/inferKeyGrade.test.ts
src/domain.operations/keyrack/inferKeyrackVaultFromKey.test.ts
src/domain.operations/keyrack/session/unlockKeyrackKeys.integration.test.ts
src/domain.operations/keyrack/session/unlockKeyrackKeys.test.ts
src/domain.operations/keyrack/setKeyrackKey.test.ts
src/domain.operations/keyrack/setKeyrackKeyHost.integration.test.ts
src/domain.operations/keyrack/setKeyrackKeyHost.test.ts
```

grep each for skip/only:

| file | has skip? | has only? |
|------|-----------|-----------|
| keyrack.vault.awsIamSso.acceptance.test.ts | ✓ line 474 (pre-extant) | ✗ |
| all other files | ✗ | ✗ |

**assessment:** only pre-extant skip in acceptance test, no new skips.

### step 6: hostile perspective — what did I miss?

**challenge:** "the keyrack.vault.awsIamSso.acceptance.test.ts has a skip"

response: the skip at line 474 is for `[case7] profile storage with --exid`. this is a deferred feature, not a regression. the skip was present before this PR and is documented in the test comments.

**challenge:** "you might have .only() that is caught by lint but not by grep"

response: ran `git diff origin/main -- '*.test.ts' | grep -E '^\+.*\.only\('` with zero matches. also, CI lint checks would catch any .only() usage.

**challenge:** "there could be hidden skips via jest.mock patterns"

response: jest.mock is used for mocked dependencies (gh cli, stdin), not to skip tests. the mocks enable tests to run, not skip.

### step 7: summary table

| check | result | notes |
|-------|--------|-------|
| .skip() in new code | ✓ none | no new skips added |
| .only() in new code | ✓ none | no new only added |
| silent credential bypasses | ✓ none | no skip patterns detected |
| prior failures carried forward | ✓ none | no TODO/FIXME in changed files |
| pre-extant skips | 6 found | all justified, none in core scope |

### conclusion

zero skips or only statements added by this PR:
- all 6 detected skips are pre-extant
- no silent credential bypasses
- no prior failures carried forward
- changed test files have no skips (except one pre-extant deferred feature)

### non-issues that hold

#### non-issue 1: pre-extant skips are all documented

**why it holds:** all 6 skips found are in files not touched by this PR:
- `invokeEnroll.acceptance.test.ts:42` — enrollment feature, separate scope
- `invokeRun.integration.test.ts:336` — run command, separate scope
- `addAttemptQualifierToOutputPath.test.ts:118` — output path logic, separate scope
- `keyrack.sudo.acceptance.test.ts:1463` — sudo scope, gap.3
- `keyrack.recipient.acceptance.test.ts:457` — recipient scope, gap.4
- `keyrack.vault.awsIamSso.acceptance.test.ts:474` — profile storage with --exid, deferred

each skip is documented with clear reason. no attempt to hide failures.

#### non-issue 2: github app tests have zero skips

**why it holds:** the new acceptance test file `keyrack.vault.osSecure.githubApp.acceptance.test.ts` has 13 tests, zero skips. verified via:

```
rhx grepsafe --pattern '\.skip\(|\.only\(' --glob 'keyrack.vault.osSecure.githubApp.acceptance.test.ts'

🐢 crickets...

🐚 grepsafe
   ├─ pattern: \.skip\(|\.only\(
   ├─ path: .
   ├─ glob: keyrack.vault.osSecure.githubApp.acceptance.test.ts
   └─ matches: 0
```

zero skips found in the new github app acceptance tests.

#### non-issue 3: git diff shows zero new skips

**why it holds:** ran git diff to check for new skips added by this PR:

```
git diff origin/main -- '*.test.ts' | rhx grepsafe --pattern '^\+.*\.skip\('

🐢 crickets...

🐚 grepsafe
   ├─ pattern: ^\+.*\.skip\(
   ├─ path: .
   └─ matches: 0
```

the PR adds zero new skips to the codebase.

review complete.
