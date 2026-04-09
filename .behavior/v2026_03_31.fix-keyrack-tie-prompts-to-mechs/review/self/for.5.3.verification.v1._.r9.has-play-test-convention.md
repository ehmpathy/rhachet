# review: has-play-test-convention

## question

are journey test files named correctly?

- `.play.test.ts` — journey test
- `.play.integration.test.ts` — if repo requires integration runner
- `.play.acceptance.test.ts` — if repo requires acceptance runner

verify:
- are journey tests in the right location?
- do they have the `.play.` suffix?
- if not supported, is the fallback convention used?

## review

reviewed: 2026-04-04

### step 1: search for `.play.` files

ran glob `**/*.play*.test.ts`:

```
No files found
```

the `.play.` convention is not used in this codebase.

### step 2: identify journey tests in codebase

per this PR, journey tests exist in:

| journey | test file | type |
|---------|-----------|------|
| github app guided setup | `keyrack.vault.osSecure.githubApp.acceptance.test.ts` | dedicated acceptance |
| aws sso guided setup | `keyrack.vault.awsIamSso.acceptance.test.ts` case13 | within acceptance |

### step 3: verify github app journey test

ran glob `blackbox/cli/keyrack.vault.osSecure.githubApp*.ts`:

```
blackbox/cli/keyrack.vault.osSecure.githubApp.acceptance.test.ts
```

**naming pattern:** `keyrack.vault.osSecure.githubApp.acceptance.test.ts`
- follows repo convention: `{feature}.acceptance.test.ts`
- dedicated file for github app journey
- not `.play.` suffix but equivalent purpose

**content verified:**
- case1: guided setup with mock gh CLI (org → app → pem flow)
- case2: single org auto-select
- case3: mech selection prompt

**snapshot verified:**
- `keyrack.vault.osSecure.githubApp.acceptance.test.ts.snap` captures full treestruct output

### step 4: verify aws sso journey test

examined `keyrack.vault.awsIamSso.acceptance.test.ts`:

| case | description | type |
|------|-------------|------|
| case1-12 | data-driven test cases | unit-style |
| **case13** | **guided setup with mock aws CLI** | **journey** |

case13 tests the full guided setup wizard:
- prompts for sso domain selection
- prompts for account selection
- prompts for role selection
- writes profile to ~/.aws/config
- verifies via unlock → get → relock

**snapshot verified:**
- 13 snapshots capture treestruct output for all cases

### step 5: assess fallback convention

**the guide asks:** "if not supported, is the fallback convention used?"

**finding:** a fallback convention IS in use:

| convention | used? | evidence |
|------------|-------|----------|
| `.play.acceptance.test.ts` | no | no files found |
| `.acceptance.test.ts` dedicated file | yes | github app has dedicated file |
| journey case within acceptance | yes | aws sso case13 |

**both approaches are valid:**
1. github app: dedicated `*.acceptance.test.ts` file for journey
2. aws sso: numbered case within broader acceptance test

### step 6: found issues

none.

**why no issues:**
1. the `.play.` convention was never adopted in this codebase
2. a fallback convention IS in use:
   - github app → dedicated acceptance test file
   - aws sso → case13 within acceptance test
3. both journeys have snapshot coverage
4. BDD structure (given/when/then) is used throughout

### step 7: non-issues that hold

#### non-issue 1: `.play.` convention not adopted

**why it holds:** this repo uses `.acceptance.test.ts` instead of `.play.acceptance.test.ts`. zero files in the codebase use `.play.` suffix. this is a convention choice, not a violation.

**evidence:** `glob **/*.play*.test.ts` returns no files.

#### non-issue 2: github app has dedicated acceptance file

**why it holds:** `keyrack.vault.osSecure.githubApp.acceptance.test.ts` is a dedicated file for github app journey tests. this provides:
- isolation from other acceptance tests
- clear discoverability by filename
- own snapshot file

**evidence:** file exists at `blackbox/cli/keyrack.vault.osSecure.githubApp.acceptance.test.ts`

#### non-issue 3: aws sso journey is case13 within acceptance

**why it holds:** the aws sso journey test lives as case13 within `keyrack.vault.awsIamSso.acceptance.test.ts`. this follows the pre-extant pattern in this codebase where journey cases are numbered among data-driven cases.

**evidence:** `[case13] guided setup with mock aws CLI` label in test file.

#### non-issue 4: both patterns capture snapshots

**why it holds:** both journey test approaches capture stdout via snapshots:
- github app: 2 snapshots in dedicated .snap file
- aws sso: 13 snapshots in shared .snap file

**evidence:**
- `keyrack.vault.osSecure.githubApp.acceptance.test.ts.snap`
- `keyrack.vault.awsIamSso.acceptance.test.ts.snap`

### conclusion

| metric | result |
|--------|--------|
| `.play.` files found | 0 |
| `.acceptance.test.ts` dedicated journey files | 1 (github app) |
| journey cases within acceptance tests | 1 (aws sso case13) |
| snapshot coverage | yes (both journeys) |
| found issues | 0 |
| non-issues that hold | 4 |

**assessment:** the `.play.` convention is not used in this codebase. a fallback convention IS in use: github app has a dedicated acceptance test file, aws sso has case13 within its acceptance test. both approaches provide snapshot coverage for journey outputs. there are no convention violations.

**answer to guide questions:**
1. are journey tests in the right location? — yes (blackbox/cli/)
2. do they have the `.play.` suffix? — no (repo uses `.acceptance.test.ts`)
3. is the fallback convention used? — YES (dedicated files + numbered cases)

review complete.

