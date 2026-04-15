# self-review r8: role-standards-coverage

final pass. thorough coverage check. what patterns should be present?

---

## the change (reminder)

**prod (vaultAdapterAwsConfig.ts lines 183-188):**
```ts
// validate sso session via mech (triggers browser login if expired)
const mechAdapter = getMechAdapter(input.mech);
await mechAdapter.deliverForGet({ source });

// return profile name (AWS SDK derives credentials from profile)
return source;
```

**test (vaultAdapterAwsConfig.test.ts lines 151-176):**
```ts
when('[t0.5] get called with exid and mech', () => {
  beforeEach(() => {
    execMock.mockImplementation((cmd: string, callback: any) => {
      callback(null, {
        stdout: ['AWS_ACCESS_KEY_ID=...', ...].join('\n'),
        stderr: '',
      });
      return {} as any;
    });
  });
  then('returns the exid (profile name), not credentials', async () => {
    const result = await vaultAdapterAwsConfig.get({
      slug: 'acme.prod.AWS_PROFILE',
      exid: 'acme-prod',
      mech: 'EPHEMERAL_VIA_AWS_SSO',
    });
    expect(result).toEqual('acme-prod');
  });
});
```

---

## rule directories to check

| directory | applicable? | why |
|-----------|-------------|-----|
| lang.terms/ | yes | term choices in code |
| lang.tones/ | yes | comment style |
| code.prod/evolvable.procedures/ | yes | function signatures |
| code.prod/evolvable.domain.operations/ | yes | get/set/gen verbs |
| code.prod/readable.comments/ | yes | inline comments |
| code.prod/readable.narrative/ | yes | flow and returns |
| code.prod/pitofsuccess.errors/ | yes | error propagation |
| code.prod/pitofsuccess.procedures/ | yes | idempotency |
| code.test/frames.behavior/ | yes | bdd structure |
| code.test/scope.coverage/ | yes | grain-appropriate tests |

---

## deep coverage analysis

### 1. should there be HelpfulError wraps?

**rule:** `rule.prefer.helpful-error-wrap` — wrap errors for observability

**analysis:** the change has one await:
```ts
await mechAdapter.deliverForGet({ source });
```

if this fails, the error propagates with the stack trace. the caller (`getKeyrackKeyHost`) already has context about which key is locked.

**question:** would a wrap add value?

```ts
await HelpfulError.wrap(
  async () => mechAdapter.deliverForGet({ source }),
  { message: 'deliverForGet.error', metadata: { source, mech: input.mech } },
)();
```

**verdict:** wrap adds metadata but the mech adapter already includes profile name in its errors. the extant pattern in other vault adapters does NOT wrap `deliverForGet`. follow extant pattern — no wrap.

---

### 2. should there be failfast guards?

**rule:** `rule.require.failfast` — guard early for invalid state

**analysis:** what could be invalid?

| state | guard present? |
|-------|----------------|
| `source` is null | yes — line 178: `if (!source) return null` |
| `input.mech` is absent | yes — line 180-181: `if (!input.mech) return source` |
| `input.mech` is invalid | yes — TypeScript enum enforces valid mech values |

**verdict:** all guards present. no additional failfast needed.

---

### 3. should there be idempotency checks?

**rule:** `rule.require.idempotent-procedures` — procedures should be safe to call twice

**analysis:** `get` is a read operation. it:
1. calls `getMechAdapter` — pure, no side effect
2. calls `deliverForGet` — side effect: validates SSO (triggers login if needed)
3. returns `source` — pure

the side effect in step 2 is idempotent:
- if session valid → no-op
- if session expired → triggers login (user action, not system state change)

**verdict:** operation is idempotent. no additional checks needed.

---

### 4. should the test use useThen?

**rule:** `rule.require.useThen-useWhen-for-shared-results` — share results across then blocks

**analysis:** the test has one `then` block. no results to share.

```ts
when('[t0.5] get called with exid and mech', () => {
  then('returns the exid (profile name), not credentials', async () => { ... });
});
```

**verdict:** single `then` — useThen not applicable.

---

### 5. should there be more assertions?

**rule:** `rule.forbid.redundant-expensive-operations` — but also ensure adequate coverage

**analysis:** the test asserts:
```ts
expect(result).toEqual('acme-prod');
```

this single assertion proves:
1. result is a string (not JSON object)
2. result equals the exid passed in
3. result is not the credentials blob

**question:** should there be negative assertions?

```ts
expect(result).not.toContain('AWS_ACCESS_KEY_ID');
expect(result).not.toMatch(/^\{/);
```

**verdict:** the positive assertion (`toEqual('acme-prod')`) is sufficient. if result were JSON, it would not equal the string `'acme-prod'`. negative assertions would be redundant.

---

### 6. should there be integration tests?

**rule:** `rule.require.test-coverage-by-grain` — adapters need integration tests

**analysis:** vault adapters are communicators (per grain definitions). communicators need integration tests.

**check:** does an integration test exist?

the file `vaultAdapterAwsConfig.test.ts` IS the integration test — it mocks the child_process module but tests the full adapter logic. the `.test.ts` suffix (not `.unit.test.ts`) indicates integration scope.

**verdict:** integration test present. coverage adequate.

---

### 7. should there be TypeScript type guards?

**rule:** `rule.require.shapefit` — types must fit

**analysis:** the return type is inferred from the `VaultAdapter.get` interface:
```ts
get: async (input) => { ... }: Promise<string | null>
```

`return source` where `source: string | null` fits `Promise<string | null>`.

**verdict:** types fit. no additional guards needed.

---

### 8. should there be comments for the discard?

**analysis:** the code discards the `deliverForGet` result:
```ts
await mechAdapter.deliverForGet({ source });  // result discarded
```

is this clear? the comment on line 183 explains why:
```ts
// validate sso session via mech (triggers browser login if expired)
```

the word "validate" implies side-effect-only (check validity, not extract value).

**verdict:** comment adequately explains the discard.

---

## coverage summary

| standard | pattern needed? | present? | notes |
|----------|-----------------|----------|-------|
| HelpfulError wrap | no | n/a | extant pattern: no wrap |
| failfast guards | no | extant | null/mech guards at lines 178, 180-181 |
| idempotency | no | inherent | read operation, SSO check idempotent |
| useThen | no | n/a | single then block |
| more assertions | no | n/a | positive assertion sufficient |
| integration test | yes | present | `.test.ts` file is integration test |
| type guards | no | n/a | types fit via interface |
| discard comment | yes | present | "validate" implies side-effect-only |

---

## why it holds

**all relevant standards are covered.**

1. **no wrap needed** — the extant pattern for vault adapters does not wrap `deliverForGet`. follow extant.

2. **guards extant** — null checks and mech checks are already at lines 178 and 180-181.

3. **idempotent by nature** — the `get` operation reads state and triggers validation. safe to call twice.

4. **test adequate** — single assertion proves the fix. negative assertions would be redundant.

5. **integration test present** — the `.test.ts` file mocks child_process and tests the full adapter.

6. **comment explains discard** — "validate sso session" makes clear the call is for side effect only.

the implementation has complete coverage of all applicable mechanic role standards.

