# self-review r3: has-pruned-backcompat

reviewed the blueprint for backwards compatibility concerns not explicitly requested.

---

## backwards compat analysis

### concern 1: no boot.yml = say all

**where mentioned:** vision doc section "edgecases":
> "no boot.yml | say all — current behavior preserved"

**is this backwards compat?** yes. this is a backwards compat guarantee.

**was it requested?** not explicitly by the wisher. the wish just said to "drop a boot.yml."

**evidence it's needed?** yes. the machinery implements this already. see computeBootPlan.ts lines 417-425:
```ts
// no config = say all (backwards compat)
if (!input.config) {
  return {
    briefs: { say: input.briefRefs, ref: [] },
    ...
  };
}
```

**did we add this?** no. the machinery already has this behavior. we didn't add any code.

**verdict:** not a YAGNI — it's extant machinery behavior, not a new addition ✓

---

### concern 2: unmatched briefs become refs

**where mentioned:** vision doc and boot.yml header comment:
> "unmatched briefs become refs automatically"

**is this backwards compat?** no. this is the primary behavior we want.

**was it requested?** yes. the wish explicitly asked for say vs ref curation.

**verdict:** required behavior ✓

---

## backwards compat in blueprint

scanned the blueprint for backwards compat concerns:

| blueprint section | mentions backcompat? |
|-------------------|---------------------|
| summary | no |
| filediff tree | no |
| codepath tree | all [○] retain — no changes |
| test coverage | no |
| boot.yml content | no |
| expected result | no |

**found:** the blueprint mentions no backwards compatibility concerns.

---

## backwards compat added by me?

did I add any backwards compat "to be safe"?

1. **comments in boot.yml** — not backwards compat
2. **file header** — not backwards compat
3. **any code shims** — no, zero code changes
4. **any type aliases** — no, zero code changes
5. **any deprecation warnings** — no, zero code changes

**verdict:** no backwards compat was added ✓

---

## summary

| concern | type | verdict |
|---------|------|---------|
| no boot.yml = say all | extant machinery | not added by us |
| unmatched = ref | primary behavior | required |

**backwards compat additions:** zero

the blueprint proposes no backwards compat concerns because:
- no code changes
- the machinery already handles all edge cases
- we just add a config file

YAGNI for backcompat: satisfied ✓
