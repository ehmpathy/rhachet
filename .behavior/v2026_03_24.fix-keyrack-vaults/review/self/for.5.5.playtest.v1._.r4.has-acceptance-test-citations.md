# self-review r4: has-acceptance-test-citations

## deeper pass: verify each citation is accurate

r3 provided citations. this pass verifies each by re-read of acceptance test source.

---

## verification: os.daemon citations

### step 1.1: set to daemon → mech: EPHEMERAL_VIA_SESSION, vault: os.daemon

**r3 claim:** `keyrack.vault.osDaemon.acceptance.test.ts` lines 30-76, `[case1] [t0]`

**verification:** re-read lines 30-76

```typescript
when('[t0] keyrack set --key DAEMON_KEY --vault os.daemon', () => {
  // ... setup ...
  then('mech is EPHEMERAL_VIA_SESSION', () => {
    const parsed = JSON.parse(result.stdout);
    expect(parsed.mech).toEqual('EPHEMERAL_VIA_SESSION');
  });
  // line 57: expect(parsed.vault).toEqual('os.daemon');
```

**holds:** test asserts exact playtest pass criteria.

### step 1.2: get from daemon → status: granted with secret

**r3 claim:** `keyrack.vault.osDaemon.acceptance.test.ts` lines 78-138, `[case1] [t1]`

**verification:** re-read lines 106-124

```typescript
then('status is granted', () => {
  const parsed = JSON.parse(result.stdout);
  expect(parsed.status).toEqual('granted');
});

then('grant contains the secret value', () => {
  const parsed = JSON.parse(result.stdout);
  expect(parsed.grant.key.secret).toEqual('daemon-get-test-value');
});
```

**holds:** test asserts `status: granted` and secret retrieval.

### step 1.3: list shows daemon key

**r3 claim:** `keyrack.vault.osDaemon.acceptance.test.ts` lines 336-382, `[case5] [t0]`

**verification:** re-read lines 373-380

```typescript
then('os.daemon key appears in host manifest list with ephemeral mech', () => {
  const parsed = JSON.parse(result.stdout);
  const entry = parsed['testorg.test.DAEMON_NO_PERSIST_KEY'];
  expect(entry).toBeDefined();
  expect(entry.vault).toEqual('os.daemon');
  expect(entry.mech).toEqual('EPHEMERAL_VIA_SESSION');
});
```

**holds:** test asserts key appears in list with vault=os.daemon.

---

## verification: 1password citations

### step 2.1: set with 1password → mech: REFERENCE, vault: 1password

**r3 claim:** `keyrack.vault.1password.acceptance.test.ts` lines 75-111, `[case1] [t1]`

**verification:** re-read lines 75-111. this test verifies format validation, not mech assertion.

**issue found:** r3 cited wrong test for mech verification.

**correction:** mech verification is in `[case5] [t0]` lines 290-308:

```typescript
then('mech is REFERENCE', () => {
  const parsed = JSON.parse(result.stdout);
  expect(parsed['testorg.test.ONEPASSWORD_TEST_KEY'].mech).toEqual('REFERENCE');
});
```

**updated citation:** format → `[case1] [t1]`, mech → `[case5] [t0]`

### step 2.2: unlock 1password key

**r3 claim:** gap — requires real auth

**verification:** correct. no test covers authenticated unlock flow.

**why acceptable:** 1password auth requires biometric or password prompt. cannot be automated without service account (which changes the test scenario).

### step 2.3: get 1password key after unlock

**r3 claim:** partial — `[case3] [t0]` covers locked state

**verification:** re-read lines 211-242. test verifies:
- status is locked (not granted)
- secret is not exposed
- fix mentions unlock

**gap confirmation:** full granted flow not covered. acceptable per r3 rationale.

---

## verification: edge case citations

### step 3.1: op cli not installed → exit 2 with instructions

**r3 claim:** `keyrack.vault.1password.acceptance.test.ts` lines 319-383, `[case6] [t0]`

**verification:** re-read lines 356-381

```typescript
then('exits with code 2 (constraint error)', () => {
  // ...
  expect(result.status).toEqual(2);
});

then('output includes install instructions', () => {
  // ...
  expect(output).toMatch(/install|1password/i);
});
```

**holds:** test asserts exit code 2 and install instructions.

### step 3.2: invalid exid → roundtrip fails

**r3 claim:** `keyrack.vault.1password.acceptance.test.ts` lines 25-73, `[case1] [t0]`

**verification:** re-read lines 30-73. test sends invalid format `'invalid-exid-format'` and asserts non-zero exit.

**holds:** test covers invalid exid rejection.

### step 3.3: daemon key after relock → status: absent

**r3 claim:** `keyrack.vault.osDaemon.acceptance.test.ts` lines 208-265, `[case3] [t0]`

**verification:** re-read lines 250-262

```typescript
then('status is absent (ephemeral key was cleared)', () => {
  const parsed = JSON.parse(result.stdout);
  expect(parsed.status).toEqual('absent');
});

then('fix mentions set', () => {
  const parsed = JSON.parse(result.stdout);
  expect(parsed.fix).toContain('set');
});
```

**holds:** test asserts status=absent and hint to re-set.

---

## corrected citation table

| playtest step | acceptance test | test case | verified |
|---------------|-----------------|-----------|----------|
| 1.1 os.daemon set | osDaemon | [case1][t0] | mech=EPHEMERAL_VIA_SESSION, vault=os.daemon |
| 1.2 os.daemon get | osDaemon | [case1][t1] | status=granted, secret value |
| 1.3 os.daemon list | osDaemon | [case5][t0] | key in list with vault=os.daemon |
| 2.1 1password set (format) | 1password | [case1][t1] | format accepted |
| 2.1 1password set (mech) | 1password | [case5][t0] | mech=REFERENCE |
| 2.2 1password unlock | — | — | gap: requires real auth |
| 2.3 1password get | 1password | [case3][t0] | locked state only |
| 3.1 op cli absent | 1password | [case6][t0] | exit 2, install instructions |
| 3.2 invalid exid | 1password | [case1][t0] | non-zero exit |
| 3.3 daemon after relock | osDaemon | [case3][t0] | status=absent, hint |

---

## conclusion

r3 had one citation error (step 2.1 mech verification). corrected in this review.

all other citations verified against source code.

holds.
