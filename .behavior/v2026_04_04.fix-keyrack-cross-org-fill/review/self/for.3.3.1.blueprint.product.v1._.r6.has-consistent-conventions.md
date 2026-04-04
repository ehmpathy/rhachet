# self-review r6: has-consistent-conventions

fresh eyes on convention alignment.

---

## step 1: re-read the blueprint

the blueprint proposes:

**production code change**:
```ts
const orgFromSlug = slug.split('.')[0]!;
```

**test case name**: `[case8] cross-org extends (root=ahbode, extended=rhight)`

**test variables**: `repo`, `roleDir`, `manifest`, `result`, `usptoLog`, `awsLog`

---

## step 2: search for extant conventions

### variable name conventions in fillKeyrackKeys.ts

from the file (via prior research):
- `keyStatusMap` — map of key status
- `keysToSet` — array filter
- `keyName` — extracted from slug
- `contextKeyrack` — context object

pattern: camelCase with descriptive suffixes.

### variable name conventions in getKeyrackKeyGrant.ts

from line 70-72:
- `orgFromSlug` — extracted from slug
- `envFromSlug` — extracted from slug

pattern: `{noun}From{Source}` for extractions.

### test case name conventions

from extant tests in the file:
- `[case1] key exists and is unlocked`
- `[case2] key exists but is locked`
- `[case3] key does not exist`

pattern: `[caseN] {description}` with lowercase description.

---

## step 3: check each name in blueprint

| name | extant pattern | blueprint | verdict |
|------|---------------|-----------|---------|
| `orgFromSlug` | `orgFromSlug` in getKeyrackKeyGrant | exact match | holds ✓ |
| `[case8]` | `[caseN]` pattern | follows | holds ✓ |
| `repo`, `roleDir` | common test variables | standard | holds ✓ |
| `usptoLog`, `awsLog` | descriptive suffixes | consistent | holds ✓ |

---

## step 4: are new terms introduced?

**question**: does the fix introduce terminology not in the codebase?

**answer**: no. `orgFromSlug` already exists in `getKeyrackKeyGrant.ts`. the fix reuses extant vocabulary.

---

## summary

| convention check | result |
|-----------------|--------|
| production variable name | matches extant (`orgFromSlug`) |
| test case name | follows `[caseN]` pattern |
| test variables | standard names |
| new terminology | none — reuses extant |

no convention divergence. the fix aligns with the codebase.

