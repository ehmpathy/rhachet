# review: has-contract-output-variants-snapped (r6)

## verdict: complete — no public contracts modified

this work modifies internal domain types and operations only. no public contracts (cli, api, sdk) were added or modified.

---

## verification performed

### step 1: identify touched files

```
src/domain.objects/BrainHookEvent.ts
src/domain.objects/RoleHooksOnBrain.ts
src/domain.operations/brains/syncOneRoleHooksIntoOneBrainRepl.ts
src/_topublish/rhachet-brains-anthropic/src/hooks/translateHook.ts
src/_topublish/rhachet-brains-anthropic/src/hooks/config.dao.ts
src/_topublish/rhachet-brains-anthropic/src/hooks/genBrainHooksAdapterForClaudeCode.ts
src/_topublish/rhachet-brains-opencode/src/hooks/config.dao.ts
```

### step 2: check for snapshot usage in touched directories

```
$ grep -r toMatchSnapshot src/_topublish/rhachet-brains-anthropic/src/hooks/
(no matches)

$ grep -r toMatchSnapshot src/_topublish/rhachet-brains-opencode/src/hooks/
(no matches)

$ grep -r toMatchSnapshot src/domain.operations/brains/
(no matches)
```

### step 3: categorize each artifact

| artifact | category | snapshot required? |
|----------|----------|-------------------|
| BrainHookEvent | domain type | no — internal enum |
| RoleHooksOnBrain | domain interface | no — internal type |
| extractDeclaredHooks | domain operation | no — internal helper |
| translateHook | transformer | no — internal |
| config.dao (anthropic) | communicator | no — internal |
| config.dao (opencode) | communicator | no — internal |
| genBrainHooksAdapterForClaudeCode | adapter | no — internal |

---

## what I found (non-issue)

**non-issue:** no public contracts require snapshot coverage.

**why it holds:**

1. **cli commands**: no cli commands were added or modified
   - `rhx roles link` behavior is unchanged (just supports additional hook type)
   - the link command already has acceptance test coverage

2. **api endpoints**: not applicable — no api endpoints in scope

3. **sdk methods**: `Role.build` signature unchanged
   - before: accepts `onBoot`, `onTool`, `onStop` hooks
   - after: accepts `onBoot`, `onTool`, `onStop`, `onTalk` hooks
   - return shape unchanged
   - no new error variants

the guide states: "for each new or modified public contract"

this work modifies internal domain operations that implement hook extraction and translation. the public-faced contract (`Role.build`) signature and return shape are unchanged — it now accepts an additional hook type, which is an additive, backwards-compatible change.

---

## checklist applied

for `Role.build` (the only public contract touched):

| check | result | notes |
|-------|--------|-------|
| positive path snapped | n/a | no new output shape |
| negative path snapped | n/a | no new error variants |
| help/usage snapped | n/a | not a cli command |
| edge cases snapped | n/a | no new edge cases |

---

## conclusion

this review passes because:
- no cli commands were added or modified
- no api endpoints were added or modified
- the sdk method `Role.build` has unchanged signature and return shape
- the only change is that it now accepts additional hook type (`onTalk`)
- internal operations do not require snapshot coverage
