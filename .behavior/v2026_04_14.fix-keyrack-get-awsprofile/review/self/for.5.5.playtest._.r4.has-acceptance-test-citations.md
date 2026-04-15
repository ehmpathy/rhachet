# self-review: has-acceptance-test-citations (r4)

> 5.5.playtest

---

## investigation: playtest steps traced to tests

### playtest step 1: keyrack get returns profile name

**playtest expectation:**
```
rhx keyrack get --key AWS_PROFILE --env test
→ ehmpathy.demo (simple string, not JSON)
```

**test coverage analysis:**

| test file | test case | line range | what it verifies |
|-----------|-----------|------------|------------------|
| vaultAdapterAwsConfig.test.ts | [case2][t0] | 153-160 | adapter returns exid without mech |
| vaultAdapterAwsConfig.test.ts | [case2][t0.5] | 163-188 | adapter returns exid with mech |
| keyrack.vault.awsIamSso.acceptance.test.ts | [case11][t4] | 1061-1087 | CLI output format |

**critical discrepancy found:**

the acceptance test at lines 1075-1081 expects JSON credentials:

```ts
then('value is the transformed credentials json', () => {
  // .note = AWS SSO mech transforms profile name → credentials JSON
  const parsed = JSON.parse(result.stdout);
  const creds = JSON.parse(parsed.grant.key.secret);
  expect(creds.AWS_ACCESS_KEY_ID).toBeDefined();
});
```

the playtest expects simple profile name: `ehmpathy.demo`

**resolution: tests verify different layers**

| layer | what returns | test |
|-------|--------------|------|
| vault adapter | profile name (the fix) | unit test [case2][t0.5] |
| daemon grant | stored secret from unlock | acceptance test [case11][t4] |

the adapter fix is verified by unit tests. the acceptance test verifies the daemon layer which stores `grant.key.secret` — this is populated at unlock time by `mech.deliverForGet()`, not by `vault.get()`.

### playtest step 2: profile name works with aws cli

**playtest expectation:**
```
aws sts get-caller-identity --profile "$(rhx keyrack get --key AWS_PROFILE --env test)"
→ returns identity (or asks for sso login)
```

**test coverage:**
- integration test: `vaultAdapterAwsConfig.integration.test.ts:[case4][t0]`
  - location: lines 93-124
  - verifies: real `aws sts get-caller-identity` call succeeds or returns auth error

**note:** manual playtest verification validates CLI composition that cannot be automated without real AWS credentials.

### playtest step 3: adapter returns exid when mech is set

**playtest expectation:**
- unit tests `[case2][t0]` and `[case2][t0.5]` pass

**test coverage:**
- `[case2][t0]`: lines 153-160 — `expect(result).toEqual('acme-prod')` without mech
- `[case2][t0.5]`: lines 163-188 — `expect(result).toEqual('acme-prod')` with mech

---

## why acceptance test expects JSON (not a bug)

the acceptance test is correct for its layer:

1. **unlock flow**: `keyrack unlock` calls `vault.get()` then `mech.deliverForGet()`
2. **mech.deliverForGet**: transforms profile name → credentials JSON
3. **daemon stores**: `grant.key.secret = mech.deliverForGet().secret` (JSON)
4. **keyrack get**: returns `grant.key.secret` from daemon

the fix ensures `vault.get()` returns profile name. the daemon stores what `mech.deliverForGet()` returns — credentials JSON for AWS SSO.

**the playtest step 1 expectation is incorrect.** `keyrack get` returns the daemon's stored secret, which is credentials JSON for AWS SSO mech.

---

## updated understanding

| command | what it returns | why |
|---------|-----------------|-----|
| `vault.get()` | profile name (the fix) | adapter returns exid |
| `mech.deliverForGet()` | credentials JSON | mech transforms for ephemeral credentials |
| `keyrack get` (CLI) | credentials JSON | daemon stores mech output |

the wish says "it should just set AWS_PROFILE" — but the mech layer deliberately transforms for SSO credentials. the acceptance test is correct.

---

## verdict

**blocker** — playtest step 1 expectation conflicts with architecture:

the playtest expects `keyrack get` to return profile name, but:
1. the adapter fix returns profile name (verified by unit tests)
2. the mech layer transforms to credentials JSON (by design for SSO)
3. the daemon stores mech output (credentials JSON)
4. `keyrack get` returns daemon's stored value (credentials JSON)

either:
- playtest expectation needs update to match architecture
- or architecture needs change if profile name output is desired

the adapter-level fix is correct. the discrepancy is in playtest expectations vs daemon architecture.

