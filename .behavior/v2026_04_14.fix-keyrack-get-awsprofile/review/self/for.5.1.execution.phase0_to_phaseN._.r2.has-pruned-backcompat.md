# self-review r2: has-pruned-backcompat

fresh eyes. line by line.

---

## the change in question

```diff
-    const { secret } = await mechAdapter.deliverForGet({ source });
-    return secret;
+    await mechAdapter.deliverForGet({ source });
+    return source;
```

**before**: returns `secret` (credentials JSON)
**after**: returns `source` (profile name)

---

## who calls this function?

`vaultAdapterAwsConfig.get()` is called by:
1. the keyrack get flow (via `getKeyrackKeyHost`)
2. the roundtrip verification in `vaultAdapterAwsConfig.set()`

### caller 1: keyrack get flow

the keyrack get flow expects to return the value to `AWS_PROFILE`. the old behavior returned JSON, which was the bug. the fix returns the profile name, which is correct.

**backwards compat needed?** no — the old behavior was wrong.

### caller 2: roundtrip verification

in `vaultAdapterAwsConfig.set()` at line 270-279:

```ts
const profileRead = await vaultAdapterAwsConfig.get({
  slug: input.slug,
  exid: profileName,
});
if (profileRead !== profileName) {
  throw new UnexpectedCodePathError(
    'roundtrip failed: get returned different profile',
    { slug: input.slug, expected: profileName, actual: profileRead },
  );
}
```

**wait.** this verification compares `profileRead` to `profileName`. the old code would have compared `JSON.stringify(credentials)` to `profileName`, which would always fail.

**was this verification ever called with mech?** let me check.

the verification calls `get({ slug, exid })` — **no mech parameter**. when mech is not supplied, `get()` returns source directly (line 181: `if (!input.mech) return source;`).

**backwards compat needed?** no — the verification never used the mech path.

---

## explicit backwards compat code found?

search of the diff for backwards compat patterns:
- no `// backwards compat` comments
- no `|| legacyValue` fallbacks
- no `if (version < X)` checks
- no deprecated function wrappers

**backwards compat code found?** none.

---

## why it holds

**no backwards compat concerns.** articulation:

1. **the old behavior was the bug** — return JSON was never correct for `AWS_PROFILE`. consumers that used the JSON were already broken (AWS SDK doesn't parse JSON in `AWS_PROFILE`).

2. **no callers depend on the buggy behavior** — the roundtrip verification in `set()` doesn't pass mech, so it never hit the buggy codepath.

3. **no backwards compat code was added** — the fix is a clean change, not a shim or fallback.

4. **the wisher never requested backwards compat** — the wish says "it should just set AWS_PROFILE" — no mention of maintain old behavior.

backwards compat does not apply to bug fixes. the old return value was not a feature, it was a defect.
