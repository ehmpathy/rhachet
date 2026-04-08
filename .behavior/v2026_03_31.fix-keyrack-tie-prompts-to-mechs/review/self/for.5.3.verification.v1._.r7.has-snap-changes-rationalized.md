# review: has-snap-changes-rationalized

## question

is every `.snap` file change intentional and justified?

for each `.snap` file in git diff:
1. what changed? (added, modified, deleted)
2. was this change intended or accidental?
3. if intended: what is the rationale?

## review

reviewed: 2026-04-04

### step 0: verification via git diff

ran `git diff origin/main --name-status -- '**/*.snap'`:

```
M	blackbox/cli/__snapshots__/keyrack.validation.acceptance.test.ts.snap
M	blackbox/cli/__snapshots__/keyrack.vault.awsIamSso.acceptance.test.ts.snap
```

ran `git status -- '**/*.snap'`:

```
Untracked files:
	blackbox/cli/__snapshots__/keyrack.vault.osSecure.githubApp.acceptance.test.ts.snap
```

confirmed: 2 modified, 1 added.

### step 1: inventory of snapshot changes

| file | status | change type |
|------|--------|-------------|
| keyrack.validation.acceptance.test.ts.snap | modified | vault name updated |
| keyrack.vault.awsIamSso.acceptance.test.ts.snap | modified | vault name updated |
| keyrack.vault.osSecure.githubApp.acceptance.test.ts.snap | added | new test coverage |

### step 2: rationalize keyrack.validation.acceptance.test.ts.snap

ran `git diff origin/main -- '**/keyrack.validation.acceptance.test.ts.snap'`:

```diff
-⛈️ BadRequestError: invalid --vault: must be one of os.direct, os.secure, os.daemon, os.envvar, 1password, aws.iam.sso
+⛈️ BadRequestError: invalid --vault: must be one of os.direct, os.secure, os.daemon, os.envvar, 1password, aws.config
```

**what changed:** vault name in error message list

**intended?** YES

**rationale:** vault renamed from `aws.iam.sso` to `aws.config` per vision document. the error message correctly reflects the new vault name in the list of valid vaults.

### step 3: rationalize keyrack.vault.awsIamSso.acceptance.test.ts.snap

ran `git diff origin/main -- '**/keyrack.vault.awsIamSso.acceptance.test.ts.snap' | grep -c 'aws.iam.sso'`:

```
26
```

ran `git diff origin/main -- '**/keyrack.vault.awsIamSso.acceptance.test.ts.snap' | grep -c 'aws.config'`:

```
26
```

confirmed: 26 removals matched by 26 additions — all `aws.iam.sso` → `aws.config`.

**what changed:** all 13 test cases renamed vault from `aws.iam.sso` to `aws.config`:
- test case names (describe blocks)
- json output `"vault"` field values
- human readable treestruct `vault:` lines

**intended?** YES

**rationale:** this is the vault rename from `aws.iam.sso` to `aws.config` per vision document:

> wisher confirmed in wish: "lets make it clear that only 'aws.config' vault supports AWS_PROFILE keys"

the output format is unchanged. only the vault name differs.

### step 4: rationalize keyrack.vault.osSecure.githubApp.acceptance.test.ts.snap

ran `wc -l blackbox/cli/__snapshots__/keyrack.vault.osSecure.githubApp.acceptance.test.ts.snap`:

```
40 blackbox/cli/__snapshots__/keyrack.vault.osSecure.githubApp.acceptance.test.ts.snap
```

ran `rhx grepsafe --pattern 'exports\[' --glob '*githubApp*.snap'`:

```
blackbox/cli/__snapshots__/keyrack.vault.osSecure.githubApp.acceptance.test.ts.snap:1:exports[`keyrack vault os.secure with EPHEMERAL_VIA_GITHUB_APP given: [case1] guided setup with mock gh CLI when: [t0] keyrack set --vault os.secure --mech EPHEMERAL_VIA_GITHUB_APP via guided wizard (pseudo-TTY) then: stdout matches snapshot 1`]
blackbox/cli/__snapshots__/keyrack.vault.osSecure.githubApp.acceptance.test.ts.snap:25:exports[`keyrack vault os.secure with EPHEMERAL_VIA_GITHUB_APP given: [case1] guided setup with mock gh CLI when: [t1] keyrack list --json after guided set then: stdout matches snapshot 1`]
```

confirmed: 2 snapshot exports — guided setup stdout and list json output.

**what changed:** file added (new test coverage)

**intended?** YES

**rationale:** this snapshot file captures the new EPHEMERAL_VIA_GITHUB_APP guided setup output:

```
exports[`...guided setup with mock gh CLI...then: stdout matches snapshot 1`] = `
"🔐 keyrack set testorg.test.GITHUB_TOKEN via EPHEMERAL_VIA_GITHUB_APP
   │
   ├─ which org?
   │  ├─ options
   │  │  ├─ 1. testorg
   │  │  ├─ 2. otherorg
   │  └─ choice: 1
   │     └─ testorg ✓
   │
   ├─ which app?
   ...
```

this is the primary deliverable of this PR: mech adapters own their prompts, and github app mech has guided setup for org → app → pem path.

the snapshot matches the vision document expected output format:

> ```
> keyrack set --key GITHUB_TOKEN --vault os.secure --mech EPHEMERAL_VIA_GITHUB_APP
>
> 🔐 keyrack set GITHUB_TOKEN via EPHEMERAL_VIA_GITHUB_APP
>    │
>    ├─ which org?
>    ...
> ```

### step 5: check for regressions

| regression type | found? | notes |
|-----------------|--------|-------|
| output format degraded | NO | treestruct format preserved |
| error messages less helpful | NO | error messages unchanged |
| timestamps/ids leaked | NO | timestamps redacted via `__TIMESTAMP__` |
| extra output added unintentionally | NO | all changes traced to vault rename or new feature |

### conclusion

**found issues:** 0

all snapshot changes are intentional:

| file | change | rationale |
|------|--------|-----------|
| validation.snap | vault name in error | vault rename per vision |
| awsIamSso.snap | vault name throughout | vault rename per vision |
| githubApp.snap | new file | new github app guided setup feature |

### non-issues that hold

#### non-issue 1: test case name changes in awsIamSso.snap

**why it holds:** the test case names include the vault name (e.g., `given: [case1] repo with aws.config vault configured`). these changed because the vault was renamed. this is correct behavior — test descriptions should match the code under test.

#### non-issue 2: json output vault field changes

**why it holds:** the `"vault": "aws.config"` field in json output reflects the actual vault used. the rename is intentional per vision document. all 13 test cases consistently use the new name.

#### non-issue 3: github app snapshot is new, not modified

**why it holds:** the github app acceptance test is new. the snapshot captures the guided setup output for the first time. there is no prior snapshot to compare against — this is additive coverage.

review complete.
