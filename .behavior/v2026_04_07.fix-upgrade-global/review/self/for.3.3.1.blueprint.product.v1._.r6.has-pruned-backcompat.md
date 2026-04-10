# self-review: has-pruned-backcompat (r6)

## reflection

i examined the blueprint for backwards compatibility concerns that were not explicitly requested. for each, i asked:
- did the wisher explicitly say to maintain this compatibility?
- is there evidence this backwards compat is needed?
- or did we assume it "to be safe"?

## backwards compat concerns examined

### 1. extant `rhx upgrade` behavior preserved

**what:** the blueprint preserves current local-only upgrade behavior when run with `--which local`.

**explicitly requested?** yes — implicit in "by default" phrase.
- wish says: "upgrade global rhachet **by default**"
- this implies current behavior (local upgrade) is preserved
- global is additive, not a replacement

**evidence:** wisher never said "replace local upgrade with global upgrade".

**why it holds:** extends behavior, does not break it.

---

### 2. extant output format preserved

**what:** the blueprint uses the same treestruct output format as extant upgrade.

**explicitly requested?** required by briefs (rule.require.treestruct-output).

**evidence:** blueprint output examples match extant patterns.

**why it holds:** brief requirement, not backwards compat assumption.

---

### 3. extant role/brain upgrade preserved

**what:** the blueprint preserves role and brain upgrade behavior.

**explicitly requested?** implicit in wish.
- wish focuses on global rhachet
- no mention of change to role/brain behavior

**evidence:** blueprint extends execUpgrade, does not replace role/brain logic.

**why it holds:** wish is additive. we add global, keep extant.

---

### 4. execUpgrade signature compatibility

**what:** `which` parameter is optional with default behavior.

**explicitly requested?** no — derived from "by default" semantics.

**examined:** could we make `which` required?
- would break extant callers
- wisher said "by default" — implies optional

**implicit compat:** `which` parameter is optional. extant calls continue to work.

**why it holds:** required by "by default" semantics in wish.

---

## search for hidden backwards compat

### did we add any backwards compat "to be safe"?

scanned blueprint for:
- deprecated flag aliases: none
- fallback behaviors for old clients: none
- version-specific code paths: none
- migration logic: none

### did we add any backwards compat that was not requested?

examined each file change:
- invokeUpgrade.ts: adds --which flag, no backwards compat shim
- execUpgrade.ts: adds which param with default, no backwards compat
- new files: no backwards compat (they are new)

**result:** no hidden backwards compat added.

---

## the only potential backwards compat concern

### default value for --which

**what:** when --which is not specified, we detect invocation method.
- npx → default to 'local'
- rhx → default to 'both'

**is this backwards compat?** examined:
- before: `rhx upgrade` → local only
- after: `rhx upgrade` → both (local + global)

**this is a behavior change, not backwards compat.**

the wisher explicitly requested this change:
> "rhx upgrade should also upgrade global rhachet by default"

**verdict:** not backwards compat. this IS the requested change.

---

## summary

| concern | explicitly requested? | verdict |
|---------|----------------------|---------|
| preserve local upgrade | yes (additive) | not backcompat |
| preserve output format | yes (briefs) | not backcompat |
| preserve role/brain | yes (additive) | not backcompat |
| optional which param | yes (by default) | required semantics |
| default to 'both' for rhx | yes (wish) | requested change |

## open questions for wisher

none. no backwards compat concerns found that were not either:
1. inherent to the additive nature of the wish
2. required by briefs
3. explicitly requested

## conclusion

zero backwards compat hacks found. the blueprint:
- extends behavior (adds global upgrade)
- preserves extant behavior (local + roles + brains)
- changes default as requested (rhx → both)

no "to be safe" assumptions made.

