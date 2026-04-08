# rule.require.context-for-identity

## .what

operations that need identity access must receive `ContextKeyrack`, not extracted prikeys or identities.

## .why

identity discovery is already solved in `ContextKeyrack`:
- `context.identity.getAll.prescribed` — CLI `--prikey` flags
- `context.identity.getAll.discovered()` — auto-discovered from ssh-agent, `~/.ssh/{owner}`, standard paths
- `context.identity.getOne({ for: 'manifest' })` — lazy-cached trial decrypt

extract and pass prikeys:
- duplicates logic that context already encapsulates
- loses the lazy-cache behavior
- creates divergent code paths
- violates single source of truth

## .pattern

```typescript
// vault adapter receives context
set: async (input, context) => {
  // use context.identity for verification
  const prescribed = context?.identity?.getAll.prescribed ?? [];
  const discovered = await context?.identity?.getAll.discovered() ?? [];
  const pool = [...prescribed, ...discovered];

  // try each identity for roundtrip verification
  for (const identity of pool) {
    // ...
  }
}
```

## .forbidden

```typescript
// extract and pass prikeys
adapter.set({
  ...input,
  prikeys: context.identity.getAll.prescribed,  // forbidden
});

// inline identity discovery that ignores prescribed prikeys
const identities = discoverIdentities({ owner });  // lacks prescribed
```

## .when

any operation that needs to:
- decrypt with identity (roundtrip verification, manifest decryption)
- build identity pool (prescribed + discovered)

## .see also

- `genContextKeyrack.ts` — context factory with lazy identity discovery
- `discoverIdentities.ts` — shared discovery logic (used by context)
