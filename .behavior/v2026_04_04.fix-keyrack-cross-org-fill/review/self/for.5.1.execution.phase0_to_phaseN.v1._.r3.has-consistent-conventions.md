# self-review: has-consistent-conventions (r3)

## name conventions check

### new function: asKeyrackKeyOrg

| aspect | extant pattern | new code |
|--------|----------------|----------|
| prefix | `asKeyrackKey` | `asKeyrackKey` — matches |
| suffix | `Env`, `Name`, `Slug` | `Org` — follows pattern |
| file name | `asKeyrackKeyEnv.ts` | `asKeyrackKeyOrg.ts` — matches |
| test file | `asKeyrackKeyName.test.ts` | `asKeyrackKeyOrg.test.ts` — matches |

### function signature

| aspect | extant | new |
|--------|--------|-----|
| input | `(input: { slug: string })` | `(input: { slug: string })` — matches |
| return | `string` | `string` — matches |

### jsdoc

| aspect | extant | new |
|--------|--------|-----|
| format | `.what` + `.why` | `.what` + `.why` — matches |

### test structure

| aspect | extant | new |
|--------|--------|-----|
| framework | given/when/then | given/when/then — matches |
| case labels | `[case1]`, `[case2]` | `[case1]`, `[case2]` — matches |
| test labels | `[t0]` | `[t0]` — matches |

### integration test: [case8]

| aspect | extant pattern (case1-7) | new case8 |
|--------|--------------------------|-----------|
| label format | `[case1] description` | `[case8] cross-org extends...` — matches |
| scene setup | `useBeforeAll(async () => {...})` | same — matches |
| assertions | `expect(result.summary.set).toEqual(...)` | same — matches |

## conclusion

all names and patterns follow extant conventions. no divergence detected.

- function name: `asKeyrackKeyOrg` follows `asKeyrackKey{Part}` pattern
- file name: matches extant pattern
- test file: matches extant pattern
- signature: matches extant extractors
- jsdoc: matches extant format
- test structure: matches extant cases
