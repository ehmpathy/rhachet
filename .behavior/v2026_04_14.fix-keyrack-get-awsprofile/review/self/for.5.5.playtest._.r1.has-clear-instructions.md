# self-review: has-clear-instructions

> 5.5.playtest

---

## investigation

### question 1: can the foreman follow without prior context?

i reviewed each section of the playtest:

| section | context required | verdict |
|---------|------------------|---------|
| prerequisites | aws cli, aws profile, keyrack | standard dev setup |
| setup instruction | none | added copy-paste command for first-time setup |
| happy path 1 | none | commands explicit, expected outcome clear |
| happy path 2 | none | commands use subshell substitution, outcome clear |
| happy path 3 | none | references unit tests by name |
| edge case 1 | none | command explicit, error message expected |
| edge case 2 | none | directs to unit test verification |

**issue found**: prerequisites assumed keyrack was already configured. foreman who hasn't set up keyrack with AWS_PROFILE wouldn't know how.

**fix applied**: added setup instruction with copy-paste command:
```bash
rhx keyrack set --key AWS_PROFILE --vault aws.config --exid "ehmpathy.demo" --env test
```

**verdict**: now self-contained. foreman can follow from scratch.

---

### question 2: are commands copy-pasteable?

i examined each command in the playtest:

| command | copy-pasteable? | notes |
|---------|----------------|-------|
| `rhx keyrack unlock --env test` | yes | standard keyrack command |
| `rhx keyrack get --key AWS_PROFILE --env test` | yes | standard keyrack command |
| `aws sts get-caller-identity --profile "$(rhx keyrack get...)"` | yes | subshell works in bash |
| `rhx git.repo.test --what unit --scope vaultAdapterAwsConfig` | yes | standard test command |
| `rhx git.repo.test --what integration --scope vaultAdapterAwsConfig` | yes | standard test command |
| edge case 1 set command | fixed | was absent `--env test` |
| edge case 2 internal code | fixed | was `adapter.get({...})`, not CLI |

**issues found and fixed**:

1. edge case 1 lacked `--env test` flag
   - before: `rhx keyrack set --key AWS_PROFILE --vault aws.config --exid "nonexistent-profile"`
   - after: `rhx keyrack set --key AWS_PROFILE --vault aws.config --exid "nonexistent-profile" --env test`

2. edge case 2 showed internal code, not a CLI command
   - before: `adapter.get({ slug: 'test.all.AWS_PROFILE', exid: null, mech: null })`
   - after: directs foreman to run unit tests and look for specific test case

**verdict**: all commands are now copy-pasteable.

---

### question 3: are expected outcomes explicit?

i reviewed each expected outcome:

| step | expected outcome | explicit? |
|------|------------------|-----------|
| happy path 1 | `ehmpathy.demo` (or configured profile name) | yes |
| happy path 2 | aws cli accepts profile, returns identity (or sso prompt) | yes |
| happy path 3 | unit tests `[case2][t0]` and `[case2][t0.5]` pass | fixed |
| edge case 1 | error: `aws profile 'nonexistent-profile' not found in ~/.aws/config` | yes |
| edge case 2 | adapter returns `null` | yes |
| pass/fail table | 4 criteria with pass/fail columns | yes |

**issue found and fixed**:
- happy path 3 referenced wrong test case `[case3]` (which is unlock flow)
- actual get tests are in `[case2]`
- fixed to reference `[case2][t0]` and `[case2][t0.5]`

**verdict**: all outcomes are now explicit and accurate.

---

### question 4: are edge cases covered?

i reviewed the "edgey paths" section:

| edge case | covered? | explicit outcome? |
|-----------|----------|-------------------|
| profile not in aws config | yes | expects specific error message |
| no exid provided to get | yes | expects null return, verified via unit test |

**verdict**: two edge cases documented with clear expectations.

---

## verdict

**pass** — instructions are followable:
- no prior context required (setup instruction added)
- all commands are copy-pasteable (fixed 2 issues)
- all outcomes are explicit (fixed test case reference)
- edge cases have clear expectations
