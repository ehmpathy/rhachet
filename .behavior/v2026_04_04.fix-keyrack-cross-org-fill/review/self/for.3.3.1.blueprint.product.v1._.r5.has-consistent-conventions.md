# self-review r5: has-consistent-conventions

review for name and pattern convention divergence.

---

## what names does the fix introduce?

the fix introduces one variable name:

```ts
const orgFromSlug = slug.split('.')[0]!;
```

---

## convention check: variable name pattern

**extant pattern in `getKeyrackKeyGrant.ts`**:

```ts
const orgFromSlug = slug.split('.')[0] ?? 'unknown';
const envFromSlug = slug.split('.')[1] ?? 'all';
```

**fix uses**: `orgFromSlug`

**verdict**: exact match with extant convention. no divergence.

---

## convention check: extraction pattern

| location | extraction | convention |
|----------|------------|------------|
| `getKeyrackKeyGrant` | `slug.split('.')[0]` | inline |
| fix | `slug.split('.')[0]` | inline |

**verdict**: same inline pattern. no divergence.

---

## summary

| check | result |
|-------|--------|
| variable name | `orgFromSlug` matches extant |
| extraction pattern | inline split matches extant |
| new terms | none introduced |
| namespace | none needed |

no convention divergence found. the fix follows extant patterns exactly.

