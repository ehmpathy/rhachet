# self-review r9: has-consistent-conventions

a junior recently modified files in this repo. we need to carefully review for divergence from extant names and patterns.

---

## codebase search: does `[t0.5]` test number exist in codebase?

### grep results

```
blackbox/cli/keyrack.allowlist.acceptance.test.ts:43:    when('[t0.5] unlock then get --key ALLOWED_KEY (roundtrip)', () => {
blackbox/cli/keyrack.vault-osdirect.acceptance.test.ts:68:    when('[t0.5] unlock prep then get --for repo --env prep --json', () => {
blackbox/cli/keyrack.key-expansion.acceptance.test.ts:50:    when('[t0.5] get with full slug (roundtrip)', () => {
```

**observation:** `[t0.5]` IS an extant pattern in the codebase. used in blackbox acceptance tests for insertions between `[t0]` and `[t1]`.

---

## analysis: why `[t0.5]` is used

### context from extant tests

in `keyrack.allowlist.acceptance.test.ts`:
- `[t0]` = unlock with allowed key
- `[t0.5]` = unlock then get (roundtrip)
- `[t1]` = unlock with blocked key

in `keyrack.vault-osdirect.acceptance.test.ts`:
- `[t0]` = get --for repo --env test --json
- `[t0.5]` = unlock prep then get (roundtrip)
- `[t1]` = get --for repo --env prep (after unlock)

### the pattern

`[t0.5]` is used when:
1. a new test is inserted between extant `[t0]` and `[t1]`
2. renumber would cause large diff
3. the test is logically between the two extant tests

this is the same situation as the blueprint proposal:
- extant `[t0]` = get called with exid (no mech)
- proposed `[t0.5]` = get called with exid AND mech
- extant `[t1]` = isUnlocked with valid sso session

---

## blueprint's proposed test

from `3.3.1.blueprint.product.yield.md`:

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

---

## convention check

### question: does `[t0.5]` follow extant convention?

| aspect | extant pattern | blueprint |
|--------|----------------|-----------|
| format | `[t0.5]` | `[t0.5]` |
| use case | insertion between `[t0]` and `[t1]` | insertion between `[t0]` and `[t1]` |
| scope | when blocks | when block |

**verdict:** matches extant convention exactly.

### question: do other aspects match?

| element | extant pattern | blueprint |
|---------|----------------|-----------|
| given | `'[case2] exid provided'` | `'[case2] exid provided'` |
| when | `'[tN] action'` | `'[t0.5] get called with exid AND mech'` |
| then | `'plain text assertion'` | `'returns the exid as the profile name (ignores mech)'` |

**verdict:** all aspects match extant conventions.

---

## why `[t0.5]` over renumber

alternative: renumber `[t1]` → `[t2]`, `[t2]` → `[t3]`, etc.

| approach | lines changed | git diff noise |
|----------|---------------|----------------|
| `[t0.5]` insertion | ~10 lines (new test only) | minimal |
| renumber all | 30+ lines (all test labels) | noisy |

the codebase has chosen `[t0.5]` for this exact reason — minimal diff for insertions.

---

## summary

| convention | status |
|------------|--------|
| `[t0.5]` test number | matches extant pattern (3 examples found) |
| given/when/then structure | matches |
| assertion text style | matches |
| test body style | matches |

---

## why it holds

**no divergence from extant conventions.** articulation:

1. **`[t0.5]` is extant** — grep found 3 uses in blackbox tests (keyrack.allowlist, keyrack.vault-osdirect, keyrack.key-expansion).

2. **same use case** — extant uses are for insertions between `[t0]` and `[t1]`. the blueprint has the same situation.

3. **same format** — the blueprint uses `[t0.5]` exactly as extant tests do.

4. **minimal diff is valued** — the codebase has established `[t0.5]` as the convention for insertions to avoid renumber noise.

5. **all other conventions match** — given/when/then structure, assertion text style, test body style all match extant patterns.

the blueprint follows extant conventions. no divergence detected.
