# self-review r4: has-consistent-mechanisms

review for new mechanisms that duplicate extant functionality.

---

## what mechanisms does the fix introduce?

the fix adds one line:

```ts
const orgFromSlug = slug.split('.')[0]!;
```

this extracts the org from a slug.

---

## does the codebase have a mechanism for this?

**search for extant patterns**:

from research document `3.1.3.research.internal.product.code.prod._.v1.i1.md`:

1. **`asKeyrackKeyName`** (asKeyrackKeyName.ts:5-9):
   ```ts
   const parts = input.slug.split('.');
   return parts.slice(2).join('.');
   ```
   extracts key name (segments 2+). NOT org.

2. **`getKeyrackKeyGrant`** (getKeyrackKeyGrant.ts:70-72):
   ```ts
   const orgFromSlug = slug.split('.')[0] ?? 'unknown';
   const envFromSlug = slug.split('.')[1] ?? 'all';
   ```
   extracts org and env INLINE.

---

## is the fix consistent with extant mechanisms?

**question**: should we create `asKeyrackKeyOrg` for consistency with `asKeyrackKeyName`?

**answer**: no. the extant pattern in `getKeyrackKeyGrant` is inline extraction. the fix follows this pattern.

**question**: should we reuse the extant code from `getKeyrackKeyGrant`?

**answer**: no. `getKeyrackKeyGrant` does inline extraction. so does the fix. they both use `slug.split('.')[0]`. this is consistent — not duplicated.

**question**: is `slug.split('.')[0]!` vs `slug.split('.')[0] ?? 'unknown'` a concern?

**answer**: the difference is how null is handled:
- `getKeyrackKeyGrant` uses `?? 'unknown'` as fallback
- the fix uses `!` (non-null assertion)

the fix is safe because slugs are hydrated and guaranteed to have org. `getKeyrackKeyGrant` is more defensive because it handles edge cases.

should the fix use `?? 'unknown'` for consistency?

**verdict**: no. the fix is in `fillKeyrackKeys`, which operates on hydrated slugs. the non-null assertion is appropriate. to use `?? 'unknown'` would mislead — it would suggest 'unknown' is a valid org, which it isn't.

---

## summary

the fix uses inline extraction (`slug.split('.')[0]`), consistent with `getKeyrackKeyGrant`.

no new mechanism is introduced. no duplication.

| mechanism | extant location | fix | verdict |
|-----------|-----------------|-----|---------|
| `slug.split('.')[0]` | getKeyrackKeyGrant.ts:71 | same pattern | consistent ✓ |
| `asKeyrackKeyName` | asKeyrackKeyName.ts | not applicable (extracts key, not org) | n/a |

the fix is consistent with extant mechanisms.
