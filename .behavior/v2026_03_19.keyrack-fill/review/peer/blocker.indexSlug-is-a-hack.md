# blocker: indexSlug is a hack — use fundamental .all. fallback instead

## severity
blocker (architectural smell with downstream bugs)

## location
- `src/domain.operations/keyrack/session/unlockKeyrackKeys.ts:226-230`
- `src/domain.operations/keyrack/daemon/svc/src/domain.objects/daemonKeyStore.ts`
- `src/domain.operations/keyrack/getKeyrackKeyGrant.ts:111-113`

## description

indexSlug aliases grants under a different key than their true slug. when unlock finds `org.all.API_KEY` via fallback for `--env test`, it stores the grant with:

```ts
slug: "org.all.API_KEY",        // true identity
indexSlug: "org.test.API_KEY",  // alias for storage
```

the daemon stores under `indexSlug ?? slug`, so the grant lives under `"org.test.API_KEY"` despite its origin as `org.all.API_KEY`.

## problems

1. **storage/identity mismatch** — grant IS from `org.all.KEY` but stored as if it's `org.test.KEY`
2. **deletion asymmetry** — causes `blocker.relock-fails-for-indexSlug-grants.md`
3. **lookup complexity** — every get needs `|| k.indexSlug === slug` checks
4. **alias fragility** — easy to forget indexSlug in new code paths

## root cause

fallback logic was placed in storage (unlock) instead of lookup (get).

## fix

remove indexSlug. store grants under their actual slug. implement `.all.` fallback in daemon lookup:

```ts
// daemonKeyStore.ts — store under actual slug
const set = (input: { grant: CachedGrant }): void => {
  store.set(input.grant.slug, input.grant);  // no indexSlug
};

// daemon get — fallback in lookup
const get = (input: { slug: string }): CachedGrant | null => {
  // exact match first
  const exact = store.get(input.slug);
  if (exact) return exact;

  // fallback to env=all
  const parts = input.slug.split('.');
  const allSlug = `${parts[0]}.all.${parts.slice(2).join('.')}`;
  return store.get(allSlug) ?? null;
};
```

then:
- unlock finds `org.all.API_KEY` → stores under `org.all.API_KEY` (true identity)
- get requests `org.test.API_KEY` → tries exact → falls back to `org.all.API_KEY` → found
- relock `--env all` → finds and deletes `org.all.API_KEY` correctly

## changes required

1. remove `indexSlug` from `KeyrackKeyGrant` domain object
2. update `daemonKeyStore.set()` to store under `grant.slug`
3. update `daemonKeyStore.get()` to implement `.all.` fallback
4. update `daemonKeyStore.del()` to use same lookup
5. remove `indexSlug` logic from `unlockKeyrackKeys.ts`
6. remove `|| k.indexSlug === slug` checks from `getKeyrackKeyGrant.ts`
7. update tests to reflect new behavior

## note

this fix also resolves `blocker.relock-fails-for-indexSlug-grants.md` — that bug exists because of the indexSlug indirection.
