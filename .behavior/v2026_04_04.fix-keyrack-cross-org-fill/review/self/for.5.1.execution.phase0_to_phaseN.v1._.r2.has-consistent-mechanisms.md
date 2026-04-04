# self-review: has-consistent-mechanisms (r2)

## new mechanism: asKeyrackKeyOrg

### search for related codepaths

found extant functions with same pattern:
- `asKeyrackKeyEnv.ts` — extracts env from slug (position 1)
- `asKeyrackKeyName.ts` — extracts key name from slug (position 2+)
- `asKeyrackKeySlug.ts` — constructs slug from parts

### does asKeyrackKeyOrg duplicate any extant mechanism?

no. the extant functions extract different parts of the slug:

| function | extracts | position |
|----------|----------|----------|
| asKeyrackKeyOrg | org | 0 |
| asKeyrackKeyEnv | env | 1 |
| asKeyrackKeyName | key name | 2+ |

`asKeyrackKeyOrg` completes the set — there was no extant function to extract the org segment.

### does asKeyrackKeyOrg follow the extant pattern?

yes. compared the implementations:

```ts
// asKeyrackKeyEnv (extant)
const parts = input.slug.split('.');
return parts[1] ?? '';

// asKeyrackKeyName (extant)
const parts = input.slug.split('.');
return parts.slice(2).join('.');

// asKeyrackKeyOrg (new)
const parts = input.slug.split('.');
return parts[0] ?? '';
```

same signature, same split approach, same comment style.

## conclusion

**no duplication.** `asKeyrackKeyOrg` follows the extant pattern for slug extraction and fills a gap in the set. there was no extant way to extract org from a slug.
