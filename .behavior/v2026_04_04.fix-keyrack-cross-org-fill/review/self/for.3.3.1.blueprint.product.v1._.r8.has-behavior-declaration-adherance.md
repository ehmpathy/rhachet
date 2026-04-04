# self-review r8: has-behavior-declaration-adherance

r8 — probe for subtle deviations.

---

## potential deviation 1: is `!` the right assertion?

the blueprint uses:
```ts
const orgFromSlug = slug.split('.')[0]!;
```

**concern**: what if `slug.split('.')[0]` is undefined?

**investigation**: when could slug be malformed?

1. empty slug → `''.split('.')[0]` = `''` (empty string, not undefined)
2. no dots → `'nodots'.split('.')[0]` = `'nodots'` (the whole string)
3. well-formed → `'org.env.key'.split('.')[0]` = `'org'`

**answer**: `split('.')[0]` never returns undefined. `!` is safe here.

**but wait**: extant code in `getKeyrackKeyGrant` uses `?? 'unknown'`. is that a signal?

**answer**: no. `getKeyrackKeyGrant` is defensive for potential edge cases. in `fillKeyrackKeys`, slugs come from `repoManifest.keys` which are hydrated and validated. the `!` is appropriate.

✓ no deviation. the assertion style matches the context.

---

## potential deviation 2: is the test verifiable?

the blueprint test checks log output:
```ts
const usptoLog = logCalls.find(
  (l) => typeof l === 'string' && l.includes('rhight.prod.USPTO_ODP_API_KEY'),
);
```

**concern**: does this test actual behavior or just log output?

**investigation**: what does the log output represent?

in `fillKeyrackKeys`, the emit calls are made in the set operation. the slug in the emit comes from the same code path that passes `org` to `setKeyrackKey`.

**answer**: the log reflects what was passed to `setKeyrackKey`. if the log shows the wrong org, the set used the wrong org.

additionally, the test asserts `result.summary.failed === 0`, which means roundtrip passed. roundtrip does:
1. set key
2. unlock key
3. get key
4. compare

if org were wrong, get would fail (key absent at wrong org).

✓ the test verifies actual behavior, not just cosmetic output.

---

## potential deviation 3: does the test match the wish scenario?

the wish shows:
```
ahbode/svc-verifications on vlad/feat-patenter
```

the blueprint test uses:
```
repo-case8-crossorg
```

**concern**: is the test scenario sufficiently similar?

**investigation**:
- wish: root org = ahbode, extended org = rhight
- test: root org = ahbode, extended org = rhight

**answer**: org names match exactly. the test replicates the exact scenario from the wish.

✓ test scenario adheres to the wish.

---

## summary

| potential deviation | status |
|---------------------|--------|
| `!` vs `?? 'unknown'` | ✓ appropriate for context |
| log test vs behavior test | ✓ tests actual behavior |
| test scenario mismatch | ✓ exact replica |

no deviations found. blueprint adheres to the behavior declaration.

