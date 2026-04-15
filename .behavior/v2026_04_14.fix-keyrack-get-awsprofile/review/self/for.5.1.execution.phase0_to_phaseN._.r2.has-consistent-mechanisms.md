# self-review r2: has-consistent-mechanisms

review for new mechanisms that duplicate extant functionality.

---

## new mechanisms introduced

### prod code changes

```diff
-    const { secret } = await mechAdapter.deliverForGet({ source });
-    return secret;
+    await mechAdapter.deliverForGet({ source });
+    return source;
```

**new functions?** none.
**new utilities?** none.
**new patterns?** none.
**new operations?** none.

the change removes a variable binding and changes a return value. no new mechanisms.

### test code changes

```ts
when('[t0.5] get called with exid and mech', () => {
  beforeEach(() => {
    execMock.mockImplementation((cmd: string, callback: any) => {
      callback(null, {
        stdout: [
          'AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE',
          // ...
        ].join('\n'),
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

**new test utilities?** none. uses extant `execMock` pattern from the same test file.
**new test patterns?** none. uses extant given/when/then pattern.
**new assertions?** none. uses standard `expect().toEqual()`.

---

## extant mechanisms checked

| mechanism | found? | reused? |
|-----------|--------|---------|
| `getMechAdapter()` | yes (line 21) | yes — we still call it |
| `mechAdapter.deliverForGet()` | yes | yes — we still call it |
| `execMock` in tests | yes | yes — we use the extant pattern |
| given/when/then | yes | yes — we use the extant pattern |

---

## why it holds

**no new mechanisms introduced.** articulation:

1. **no new functions** — we modified an extant function, didn't add a new one.

2. **no new utilities** — the fix uses extant variables (`source`, `mechAdapter`) and patterns.

3. **no new test patterns** — the test follows the extant mock pattern used throughout the file.

4. **extant mechanisms reused** — we still call `getMechAdapter()` and `mechAdapter.deliverForGet()`. we just ignore the return value.

the change is a 2-line logic fix with no new abstractions.
