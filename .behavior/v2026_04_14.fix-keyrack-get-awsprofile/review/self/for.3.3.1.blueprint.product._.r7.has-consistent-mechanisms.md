# self-review r7: has-consistent-mechanisms

a junior recently modified files in this repo. we need to carefully review for new mechanisms that duplicate extant functionality.

---

## the question

for each new mechanism in the blueprint, ask:
- does the codebase already have a mechanism that does this?
- do we duplicate extant utilities or patterns?
- could we reuse an extant component instead of a new one?

---

## mechanism analysis

### what mechanisms does the blueprint propose?

the blueprint proposes:
1. **modify** `vaultAdapterAwsConfig.get()` — remove mech.deliverForGet() call
2. **add** one test case for get() with mech supplied

### are these NEW mechanisms?

**modification to get():**

this is a deletion, not an addition. we remove the mech check and deliverForGet() call.

before (6 lines):
```ts
get: async (input) => {
  const source = input.exid ?? null;
  if (!source) return null;
  if (!input.mech) return source;
  const mechAdapter = getMechAdapter(input.mech);
  const { secret } = await mechAdapter.deliverForGet({ source });
  return secret;
},
```

after (3 lines):
```ts
get: async (input) => {
  const source = input.exid ?? null;
  return source;
},
```

**verdict:** no new mechanism. this is a code deletion.

**test case:**

the test is an addition to an extant test file. it follows the extant pattern:

```ts
given('[case2] exid provided', () => {
  when('[t0.5] get called with exid AND mech', () => {
    then('returns the exid as the profile name (ignores mech)', async () => {
      const result = await vaultAdapterAwsConfig.get({
        exid: 'acme-prod',
        mech: KeyrackSecretMech.EPHEMERAL_VIA_AWS_SSO,
      });
      expect(result).toEqual('acme-prod');
    });
  });
});
```

**verdict:** no new pattern. reuses extant given/when/then structure from test-fns.

---

## duplication search

### could the get() change duplicate extant code?

the fix simplifies `get()` to:
```ts
const source = input.exid ?? null;
return source;
```

**search:** is there a utility for "return exid or null"?

**answer:** no. this is a trivial operation. `input.exid ?? null` is idiomatic javascript. no utility needed.

**verdict:** no duplication.

### could the test duplicate extant tests?

**search:** are there other tests for "get returns exid when mech supplied"?

**analysis:**
- extant test `[t0] get called with exid` tests get() WITHOUT mech
- no extant test covers get() WITH mech supplied
- that's exactly the gap we fill

**verdict:** no duplication. the test covers an untested path.

---

## consistency with extant patterns

### does the fix follow extant vault adapter patterns?

**question:** do other vault adapters return exid directly from get()?

**analysis:**

vault adapters in keyrack follow this pattern:
- `get()` returns the usable secret
- for some vaults, the stored value IS the usable secret (no transform)
- for other vaults, the stored value requires transformation via mech

for aws.config vault:
- the stored value is a profile name (exid)
- the profile name IS the usable secret (AWS SDK looks it up)
- no transformation required

the fix makes aws.config.get() consistent with the vault's purpose: return the profile name.

**verdict:** consistent with extant patterns.

### does the test follow extant test patterns?

**question:** does the test structure match the extant test file?

**analysis:**

the extant test file uses:
- `given('[caseN] scenario')` blocks
- `when('[tN] action')` blocks
- `then('assertion')` blocks
- useBeforeAll for setup

the new test follows the same structure.

**verdict:** consistent with extant test patterns.

---

## summary

| mechanism | status | duplication? |
|-----------|--------|--------------|
| get() change | deletion | no |
| test case | addition | no |

---

## why it holds

**no new mechanisms duplicate extant functionality.** articulation:

1. **the fix is a deletion, not an addition** — we remove code (6 lines → 3 lines). deletion cannot duplicate extant functionality.

2. **no utility needed for trivial operation** — `input.exid ?? null` is idiomatic. a utility would be premature abstraction.

3. **the test fills a gap** — no extant test covers get() with mech supplied. we add the first test for this path.

4. **patterns are consistent** — the fix makes get() return exid directly, which matches the vault's purpose. the test follows extant given/when/then structure.

5. **no new abstractions** — we do not introduce new utilities, operations, or patterns. we simplify and test.

the blueprint does not duplicate extant functionality. it deletes code and adds one test.
