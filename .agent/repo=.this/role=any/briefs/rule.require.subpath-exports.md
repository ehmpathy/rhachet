# rule.require.subpath-exports

## .what

exports must be added to the correct subpath entrypoint, not just the root SDK.

## .why

rhachet uses subpath exports (`package.json` exports field) to enable tree-shake:

| entrypoint | file | purpose |
|------------|------|---------|
| `rhachet` | `src/index.ts` | full SDK |
| `rhachet/brains` | `src/contract/sdk.brains.ts` | brain-focused subset |
| `rhachet/actors` | `src/contract/sdk.actors.ts` | actor-focused subset |
| `rhachet/keyrack` | `src/contract/sdk.keyrack.ts` | keyrack-focused subset |

consumers import from subpaths to avoid bundle bloat:
```typescript
// pulls only brain code, not stitchers/templates/etc
import { genContextBrain } from 'rhachet/brains';
```

## .how

when you add new exports:

1. identify which domain the export belongs to
2. add to the appropriate `sdk.*.ts` file
3. root `sdk.ts` is re-exported via `index.ts` — brain-specific items also go in `sdk.brains.ts`

## .example

brain supplier types belong in both:
- `src/contract/sdk.ts` — for root access
- `src/contract/sdk.brains.ts` — for `rhachet/brains` access

## .enforcement

export added to root but absent from subpath = nitpick
