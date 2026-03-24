# blocker: relock-by-env fails for indexSlug grants

## severity
blocker

## location
`src/domain.operations/keyrack/daemon/svc/src/domain.operations/handleRelockCommand.ts:38`

## description

when relock executes by env, grants stored with `indexSlug` will fail to delete.

the daemon key store stores grants under `indexSlug ?? slug`:

```ts
// daemonKeyStore.ts:29
const indexKey = input.grant.indexSlug ?? input.grant.slug;
store.set(indexKey, input.grant);
```

but `handleRelockCommand` deletes by `grant.slug` (the source slug), not the index key:

```ts
// handleRelockCommand.ts:36-39
const keysForEnv = context.keyStore.entries({ env: input.env });
for (const key of keysForEnv) {
  context.keyStore.del({ slug: key.slug });  // BUG: uses source slug, not index key
  relockedSlugs.push(key.slug);
}
```

## scenario

1. user unlocks `--env test --key API_KEY`
2. unlock finds env=all key (`org.all.API_KEY`) via fallback
3. grant stored with `indexSlug: "org.test.API_KEY"`, `slug: "org.all.API_KEY"`
4. store key = `"org.test.API_KEY"` (the indexSlug)
5. user runs `keyrack relock --env all`
6. `entries({ env: 'all' })` returns the grant (because `grant.env === 'all'`)
7. `del({ slug: 'org.all.API_KEY' })` fails to find it (stored under `org.test.API_KEY`)
8. grant remains in daemon memory despite relock

## fix

`del()` should use `indexSlug ?? slug` as the lookup key, same as `set()`:

```ts
const del = (input: { slug: string }): boolean => {
  // check if stored by this slug directly
  if (store.has(input.slug)) {
    return store.delete(input.slug);
  }
  // otherwise search for grant where slug matches (handles indexSlug case)
  for (const [key, grant] of store.entries()) {
    if (grant.slug === input.slug) {
      return store.delete(key);
    }
  }
  return false;
};
```

or: `handleRelockCommand` should delete by the actual store key, not by grant.slug.

## test coverage needed

add test case: relock by env should delete env=all fallback grants that have indexSlug set.
