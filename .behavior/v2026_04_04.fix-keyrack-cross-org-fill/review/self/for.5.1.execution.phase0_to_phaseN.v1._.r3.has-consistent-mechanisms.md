# self-review: has-consistent-mechanisms (r3)

## search for related codepaths

searched for all `.split('.')` calls in keyrack domain operations:

```
src/domain.operations/keyrack/asKeyrackKeyName.ts:7
src/domain.operations/keyrack/asKeyrackKeyEnv.ts:8
src/domain.operations/keyrack/asKeyrackKeyOrg.ts:8
src/domain.operations/keyrack/getKeyrackKeyGrant.ts:71-72
src/domain.operations/keyrack/session/unlockKeyrackKeys.ts:80, 239
src/domain.operations/keyrack/delKeyrackKeyHost.ts:62
src/domain.operations/keyrack/setKeyrackKeyHost.ts:140
src/domain.operations/keyrack/sourceAllKeysIntoEnv.ts:109
src/domain.operations/keyrack/getOneKeyrackGrantByKey.ts:31, 56
src/domain.operations/keyrack/asKeyrackKeySlug.ts:17
src/domain.operations/keyrack/decideIsKeySlugEqual.ts:11, 32, 51, 65
```

## findings

### reusable extractors (target pattern)

| file | purpose |
|------|---------|
| asKeyrackKeyOrg | extract org (position 0) |
| asKeyrackKeyEnv | extract env (position 1) |
| asKeyrackKeyName | extract key name (position 2+) |

### inline slug splits (technical debt)

found inline code that does the same extraction:

```ts
// getKeyrackKeyGrant.ts:71-72
const orgFromSlug = slug.split('.')[0] ?? 'unknown';
const envFromSlug = slug.split('.')[1] ?? 'all';
```

this is technical debt — it duplicates the extractor logic inline.

### question: should I refactor these inline usages?

no. the ask was to fix a bug, not to refactor. the guide says:

> "unless the ask was to refactor, be consistent with extant mechanisms"

the extant **reusable** mechanisms are the `asKeyrackKey*` extractors. inline splits are technical debt. my change follows the reusable pattern. a future refactor could replace inline splits with extractors, but that's out of scope.

## conclusion

`asKeyrackKeyOrg` follows the extant extractor pattern (`asKeyrackKeyEnv`, `asKeyrackKeyName`). there is inline code that does similar extraction, but that's technical debt — not a mechanism to duplicate. the new extractor is the correct, reusable approach.
