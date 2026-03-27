# self-review r4: has-pruned-backcompat

reviewed per user feedback in memory: "never add backwards compat, just delete"

---

## backwards compat check

### what counts as backcompat?

| type | example |
|------|---------|
| code shims | rename old function, re-export with deprecation warning |
| type aliases | `type OldName = NewName` |
| fallback paths | `if (oldConfig) { /* handle legacy */ }` |
| comments about removed code | `// removed X, see Y instead` |
| unused re-exports | export kept "just in case" |

### did we add any?

| backcompat type | added? | evidence |
|-----------------|--------|----------|
| code shims | no | zero code changes |
| type aliases | no | zero code changes |
| fallback paths | no | zero code changes |
| removed-code comments | no | zero code changes |
| unused re-exports | no | zero code changes |

**verdict:** zero backcompat added

---

## why zero is correct

the blueprint proposes:
- 1 new file (boot.yml)
- 0 code modifications
- 0 type changes
- 0 api changes

there is no prior state to maintain backwards compatibility with. boot.yml is a new config file. the machinery already handles the no-boot.yml case via its extant logic — we did not add that handling, it already exists.

---

## extant fallback vs added backcompat

the computeBootPlan.ts code has:
```ts
if (!input.config) {
  return { briefs: { say: input.briefRefs, ref: [] }, ... };
}
```

this is **extant machinery**, not backcompat we added. the code was written before this wish. we did not touch it.

---

## summary

| question | answer |
|----------|--------|
| did we add backcompat code? | no |
| did we add backcompat types? | no |
| did we add backcompat comments? | no |
| did we add fallback paths? | no |
| total backcompat additions | zero |

ZERO BACKCOMPAT per user feedback. satisfied.
