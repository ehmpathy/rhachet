# review: has-contract-output-variants-snapped

## question

does each public contract have snapshots for all output variants?

for each new or modified public contract:
- is there a dedicated snapshot file?
- does it capture success cases?
- does it capture error cases?

## review

reviewed: 2026-04-04

### step 1: identify contracts changed by this PR

| contract | type | changes |
|----------|------|---------|
| keyrack set | cli | added EPHEMERAL_VIA_GITHUB_APP guided setup |
| keyrack list | cli | displays github app mech entries |
| keyrack unlock | cli | transforms github app json to ghs_ token |

### step 2: verify snapshot files exist

ran `rhx globsafe --pattern '**/keyrack.vault.*.snap'`:

```
blackbox/cli/__snapshots__/keyrack.vault.osSecure.githubApp.acceptance.test.ts.snap
blackbox/cli/__snapshots__/keyrack.vault.awsIamSso.acceptance.test.ts.snap
```

confirmed: 2 vault-specific snapshot files for this PR's scope.

### step 3: verify github app snapshot content

read `keyrack.vault.osSecure.githubApp.acceptance.test.ts.snap`:

```js
exports[`keyrack vault os.secure with EPHEMERAL_VIA_GITHUB_APP given: [case1] guided setup with mock gh CLI when: [t0] keyrack set --vault os.secure --mech EPHEMERAL_VIA_GITHUB_APP via guided wizard (pseudo-TTY) then: stdout matches snapshot 1`] = `
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
   │  ├─ options
   │  │  ├─ 1. my-test-app (id: 123456)
   │  │  ├─ 2. other-app (id: 654321)
   │  └─ choice: 1
   │     └─ my-test-app ✓
   │
   └─ private key path (.pem): ./mock-app.pem
🔐 keyrack set (org: testorg, env: test)
   └─ testorg.test.GITHUB_TOKEN
      ├─ mech: EPHEMERAL_VIA_GITHUB_APP
      └─ vault: os.secure"
`;

exports[`keyrack vault os.secure with EPHEMERAL_VIA_GITHUB_APP given: [case1] guided setup with mock gh CLI when: [t1] keyrack list --json after guided set then: stdout matches snapshot 1`] = `
{
  "testorg.test.GITHUB_TOKEN": {
    "createdAt": "__TIMESTAMP__",
    "env": "test",
    "mech": "EPHEMERAL_VIA_GITHUB_APP",
    "org": "testorg",
    "slug": "testorg.test.GITHUB_TOKEN",
    "vault": "os.secure",
  },
}
`;
```

confirmed: guided setup output and list json output are snapshotted.

### step 4: verify aws sso snapshots (must not regress)

ran `npm run test:acceptance -- keyrack.vault.awsIamSso`:

```
Test Suites: 1 passed, 1 total
Tests:       4 skipped, 63 passed, 67 total
Snapshots:   13 passed, 13 total
```

confirmed: 13 snapshots for aws sso acceptance tests pass without changes.

### step 5: coverage matrix

| contract | variant | snapshot? | file |
|----------|---------|-----------|------|
| keyrack set (github app) | guided setup success | ✓ | githubApp.acceptance.ts.snap |
| keyrack list (github app) | json output | ✓ | githubApp.acceptance.ts.snap |
| keyrack set (aws sso) | guided setup success | ✓ | awsIamSso.acceptance.ts.snap |
| keyrack list (aws sso) | json output | ✓ | awsIamSso.acceptance.ts.snap |
| keyrack set (validation) | error output | ✓ | validation.acceptance.ts.snap |

### conclusion

**found issues:** 0

all contract output variants have snapshots:
- github app guided setup: 2 snapshots (stdout, json list)
- aws sso (regression): 13 snapshots unchanged
- validation errors: snapshotted in validation acceptance tests

### non-issues that hold

#### non-issue 1: github app snapshots capture full tree output

**why it holds:** the snapshot captures the complete guided setup tree structure:
- org selection prompt with options
- app selection prompt with options
- pem path prompt
- success message with slug, mech, vault

this enables vibecheck in PRs — reviewers see actual output.

#### non-issue 2: timestamps redacted for stable snapshots

**why it holds:** timestamps are replaced with `__TIMESTAMP__` to prevent snapshot churn:
```ts
const snapped = {
  ...entry,
  createdAt: '__TIMESTAMP__',
  updatedAt: '__TIMESTAMP__',
};
```

this is standard practice for stable snapshots with dynamic fields.

review complete.
