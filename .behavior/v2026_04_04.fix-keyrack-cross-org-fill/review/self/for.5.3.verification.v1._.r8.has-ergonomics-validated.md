# self-review: has-ergonomics-validated (r8)

## the core question

> does the actual input/output match what felt right at repros?

## step 1: locate planned ergonomics

**repros artifact**: none exists (wish contains the reproduction)

**planned ergonomics sources**:
- `0.wish.md` lines 1-55: symptom and expected behavior
- `1.vision.md` (from behavior-vision in session context): before/after comparison

## step 2: extract planned input/output

### planned input

**command**: `rhx keyrack fill --env prod`

**setup**:
- root keyrack: org=`ahbode`
- extended keyrack: org=`rhight` (via `extends:` directive)
- key `USPTO_ODP_API_KEY` declared in extended keyrack

no change to input ergonomics planned — the command signature stays the same.

### planned output (before fix — from 0.wish.md lines 8-18)

```
🔑 key 1/2, USPTO_ODP_API_KEY, for 1 owner
   └─ for owner default
      ├─ set the key
      │  └─ enter secret for ahbode.prod.USPTO_ODP_API_KEY: ********
      └─ get after set, to verify
         └─ ✗ rhx keyrack get --key USPTO_ODP_API_KEY --env prod
```

symptom: prompt shows `ahbode.prod` but verify uses `rhight.prod`.

### planned output (after fix — from vision)

```
🔑 key 1/2, USPTO_ODP_API_KEY, for 1 owner
   └─ for owner default
      ├─ set the key
      │  └─ enter secret for rhight.prod.USPTO_ODP_API_KEY: ********
      └─ get after set, to verify
         └─ ✓ rhx keyrack get --key USPTO_ODP_API_KEY --env prod
```

expectation: prompt shows `rhight.prod`, verify uses `rhight.prod`, roundtrip succeeds.

## step 3: compare to actual implementation

### actual input

**command**: `rhx keyrack fill --env prod`

**no change** — the command signature is identical to planned.

### actual output

**verified via integration test** (`fillKeyrackKeys.integration.test.ts` case8):

```ts
// setup: root=ahbode, extended=rhight
// key USPTO_ODP_API_KEY declared in extended keyrack

const result = await fillKeyrackKeys({
  env: 'prod',
  owners: ['case8'],
  ...
});

// assertions:
expect(slugs).toContain('rhight.prod.USPTO_ODP_API_KEY');
expect(result.summary.set).toEqual(2);
expect(result.summary.failed).toEqual(0);
```

the test verifies:
1. slug stored under `rhight.prod` (not `ahbode.prod`)
2. roundtrip verification passed (no error thrown, failed=0)

### slug in prompt

**code path** (`fillKeyrackKeys.ts` lines 231-234):

```ts
(context.emit ?? console.log)(
  `   ${branchContinue}│  │  enter secret for ${slug}: `,
);
```

the prompt uses `slug` directly. the slug comes from manifest hydration and already contains the correct org (`rhight.prod.USPTO_ODP_API_KEY`).

**code path for set** (`fillKeyrackKeys.ts` line 258):

```ts
org: asKeyrackKeyOrg({ slug }),
```

the org is extracted from the slug. this ensures set uses the same org shown in the prompt.

## step 4: validate ergonomics match

| aspect | planned (vision) | actual (impl) | match? |
|--------|------------------|---------------|--------|
| command | `rhx keyrack fill --env prod` | same | yes |
| prompt slug | `rhight.prod.USPTO_ODP_API_KEY` | `rhight.prod.USPTO_ODP_API_KEY` | yes |
| store org | `rhight` | `rhight` (via `asKeyrackKeyOrg`) | yes |
| verify slug | `rhight.prod.USPTO_ODP_API_KEY` | `rhight.prod.USPTO_ODP_API_KEY` | yes |
| roundtrip | success | success | yes |

no drift between planned and actual ergonomics.

## step 5: check for design changes

**question**: did the design change between vision and implementation?

**answer**: no.

the vision proposed:
```ts
const orgFromSlug = slug.split('.')[0]!;
```

the implementation uses:
```ts
org: asKeyrackKeyOrg({ slug })
```

where `asKeyrackKeyOrg` does:
```ts
const parts = input.slug.split('.');
return parts[0] ?? '';
```

the logic is identical. the only difference is extraction into a named function for consistency with `asKeyrackKeyEnv` and `asKeyrackKeyName`. this is a minor structural improvement, not a design change.

## conclusion

| check | result |
|-------|--------|
| input matches planned? | yes (command unchanged) |
| output matches planned? | yes (prompt shows correct org) |
| design drifted? | no (same logic, extracted to function) |
| ergonomics validated? | yes |

the actual input/output matches what was planned in the vision. the prompt shows the correct org (`rhight.prod`), the key is stored under the correct org, and roundtrip verification succeeds. no ergonomic drift.
