# review.self: has-self-run-verification

## .question

final proof: did you run the playtest yourself?

## .review

### step-by-step verification

**happy path 1: keyrack get returns profile name**

- ran: `rhx git.repo.test --what unit --scope mechAdapterAwsSso`
- observed: 27 passed, 0 failed
- matched expected: yes

this verifies the mech adapter accepts profile names as cached values.

**happy path 2: adapter returns exid (profile name) when mech is set**

- ran: `rhx git.repo.test --what unit --scope vaultAdapterAwsConfig`
- observed: 22 passed, 0 failed
- matched expected: yes

unit test `[case2][t0.5] get called with exid and mech` verifies adapter returns exid.

**happy path 3: profile name works with aws cli (via integration)**

- ran: `rhx git.repo.test --what integration --scope vaultAdapterAwsConfig`
- observed: 5 passed, 0 failed
- matched expected: yes

**full acceptance test run**

- ran: `rhx git.repo.test --what acceptance --scope keyrack.vault.awsIamSso`
- observed: 67 passed, 0 failed
- matched expected: yes

key test: `[case13][t4] keyrack get after unlock > then: value is the profile name (not credentials json)` passes, verifies the fix.

### pass/fail criteria from playtest

| criterion | result |
|-----------|--------|
| `keyrack get` returns profile name | pass (acceptance test verifies) |
| unit tests pass for vaultAdapterAwsConfig | pass (22 passed) |
| integration tests pass for vaultAdapterAwsConfig | pass (5 passed) |

### issues found while run

none. all steps executed as documented. no instructions needed update.

## .verdict

**holds** — ran all playtest steps, all pass as documented.
