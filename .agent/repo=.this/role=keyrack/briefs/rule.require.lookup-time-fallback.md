# rule.require.lookup-time-fallback

## .what

fallback expansion belongs in lookup, not storage.

when a key is requested with `--env test` and found via `env=all` fallback, store the grant under its true slug (`org.all.KEY`). expand the fallback pattern at lookup time.

## .why

storage-time expansion creates identity/key mismatch:

| approach | store key | grant.slug | del({ slug }) | result |
|----------|-----------|------------|---------------|--------|
| storage-time | `org.test.KEY` | `org.all.KEY` | tries `org.all.KEY` | not found (bug) |
| lookup-time | `org.all.KEY` | `org.all.KEY` | tries `org.all.KEY` | found (correct) |

when you alias at storage time:
1. storage key diverges from entity identity
2. every operation (get, del, entries) must know the alias rule
3. forget the rule in one place → bug

when you expand at lookup time:
1. entity stored under true identity
2. expansion logic centralized in get
3. del and entries use true identity — no divergence

## .pattern

```ts
// store under true identity
const set = (input: { grant: Grant }): void => {
  store.set(input.grant.slug, input.grant);  // true identity
};

// expand fallback at lookup time
const get = (input: { slug: string }): Grant | null => {
  // exact match
  const exact = store.get(input.slug);
  if (exact) return exact;

  // env=all fallback
  const parts = input.slug.split('.');
  const allSlug = `${parts[0]}.all.${parts.slice(2).join('.')}`;
  return store.get(allSlug) ?? null;
};

// del uses true identity — no special handling needed
const del = (input: { slug: string }): boolean => {
  return store.delete(input.slug);
};
```

## .antipattern

```ts
// store under aliased key (indexSlug)
const set = (input: { grant: Grant }): void => {
  const indexKey = input.grant.indexSlug ?? input.grant.slug;
  store.set(indexKey, input.grant);  // diverges from grant.slug
};

// del must know about indexSlug — easy to forget
const del = (input: { slug: string }): boolean => {
  // BUG: tries grant.slug but stored under indexSlug
  return store.delete(input.slug);
};
```

## .scope

applies to:
- daemon key store (grants)
- any registry that supports fallback patterns
- cache layers with alias expansion

## .enforcement

- storage key differs from entity identity = blocker
- fallback logic in write path = blocker
- asymmetry between set/get/del signatures = blocker
