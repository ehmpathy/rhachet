# self-review: has-acceptance-test-citations

**stone**: 5.5.playtest
**artifacts**: blackbox/cli/keyrack.firewall.acceptance.test.ts, 5.5.playtest.yield.md

---

## review process

i reviewed all 13 playtests against the acceptance test file and found 3 gaps. i fixed all gaps by add of acceptance tests [t11], [t12], [t13].

---

## playtest → acceptance test citations

| playtest | file | case | lines |
|----------|------|------|-------|
| 1 | keyrack.firewall.acceptance.test.ts | case4 [t0] | 575-623 |
| 2 | keyrack.firewall.acceptance.test.ts | case4 [t1] | 625-674 |
| 3 | keyrack.firewall.acceptance.test.ts | case4 [t0] | 575-623 |
| 4 | keyrack.firewall.acceptance.test.ts | case4 [t2] | 676-716 |
| 5 | keyrack.firewall.acceptance.test.ts | case4 [t7] | 859-896 |
| 6 | keyrack.firewall.acceptance.test.ts | case4 [t13] | **ADDED** |
| 7 | keyrack.firewall.acceptance.test.ts | case4 [t2] | 676-716 |
| 8 | keyrack.firewall.acceptance.test.ts | case4 [t1] | 625-674 |
| 9 | keyrack.firewall.acceptance.test.ts | case4 [t10] | 975-1009 |
| 10 | keyrack.firewall.acceptance.test.ts | case4 [t12] | **ADDED** |
| 11 | keyrack.firewall.acceptance.test.ts | case4 [t0] | 575-623 |
| 12 | keyrack.firewall.acceptance.test.ts | case4 [t3] | 718-758 |
| 13 | keyrack.firewall.acceptance.test.ts | case4 [t11] | **ADDED** |

---

## gaps found and fixed

### gap 1: playtest 6 (multiline heredoc)
**issue**: no acceptance test for multiline secret values

**fix**: added [t13] firewall with multiline secret value
```typescript
when('[t13] firewall with multiline secret value', () => {
  const multilineSecret = '-----BEGIN RSA PRIVATE KEY-----\nMIIE...';
  then('exits successfully', () => { expect(result.status).toEqual(0); });
  then('output contains github actions format', () => { ... });
});
```

### gap 2: playtest 10 (GITHUB_ENV absent)
**issue**: no acceptance test for error when GITHUB_ENV is not set

**fix**: added [t12] firewall github.actions output requires GITHUB_ENV
```typescript
when('[t12] firewall github.actions output requires GITHUB_ENV', () => {
  // env does NOT include GITHUB_ENV
  then('exits with non-zero status', () => { ... });
  then('error mentions GITHUB_ENV', () => { ... });
});
```

### gap 3: playtest 13 (env var not set)
**issue**: no acceptance test for error when referenced env var is undefined

**fix**: added [t11] firewall with SECRETS_JSON env var not set
```typescript
when('[t11] firewall with SECRETS_JSON env var not set', () => {
  // env does NOT include SECRETS_JSON
  then('exits with non-zero status', () => { ... });
  then('error mentions env var not set', () => { ... });
});
```

---

## confirmation

all 13 playtests now have acceptance test coverage. 3 gaps were found and fixed via new acceptance tests [t11], [t12], [t13] in blackbox/cli/keyrack.firewall.acceptance.test.ts (lines 1010-1100).
