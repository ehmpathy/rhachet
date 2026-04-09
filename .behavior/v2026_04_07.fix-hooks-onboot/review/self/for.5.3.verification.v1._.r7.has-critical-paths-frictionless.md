# review: has-critical-paths-frictionless (r7)

## verdict: complete — critical paths verified via integration tests

no repros artifact exists. critical paths are derived from the blackbox criteria and verified via integration tests.

---

## critical paths from criteria

the blackbox criteria (2.1) defines these usecases:

| usecase | critical path |
|---------|---------------|
| usecase.1 | developer declares onTalk → links role → settings.json has UserPromptSubmit |
| usecase.2 | developer unlinks role → settings.json removes hook |
| usecase.3 | user submits prompt → hook fires |
| usecase.4 | multiple onTalk hooks → all synced |
| usecase.5 | onTalk alongside other hooks → all types synced |

---

## verification performed

### usecase.1 and usecase.5: hook declaration and sync

verified via `syncOneRoleHooksIntoOneBrainRepl.integration.test.ts`:

```
[case4] role with onTalk hooks
  when([t0]) hooks are synced
    then creates onTalk hooks in settings
```

the test creates a role with onTalk, syncs it, and verifies the hook appears in settings.json.

**friction check:** none detected. the sync path follows the same pattern as onBoot/onTool/onStop.

### usecase.2: hook removal on unlink

verified via `genBrainHooksAdapterForClaudeCode.integration.test.ts`:

```
del onTalk from UserPromptSubmit bucket
  then removes hook from settings
```

**friction check:** none detected. the del operation follows the extant pattern.

### usecase.3: hook fires on prompt

this is claude code runtime behavior, not rhachet scope. rhachet generates the settings.json entry; claude code executes the hook.

**friction check:** out of scope for rhachet.

### usecase.4: multiple onTalk hooks

verified via extant array handler pattern in `extractDeclaredHooks`:

```typescript
for (const h of onBrain.onTalk ?? []) {
  // each hook in array is extracted
}
```

**friction check:** none detected. the array iteration follows the same pattern as other hook types.

---

## manual verification

I reviewed the code paths:

1. **type definition** (`BrainHookEvent.ts`): `onTalk` added to union — TypeScript enforces coverage
2. **interface** (`RoleHooksOnBrain.ts`): `onTalk` added with correct shape — matches other hook types
3. **extraction** (`syncOneRoleHooksIntoOneBrainRepl.ts`): onTalk loop added — parallel to extant loops
4. **translation** (`translateHook.ts`): EVENT_MAP entry added — compiler enforces exhaustiveness
5. **schema** (`config.dao.ts`): UserPromptSubmit added — matches claude code schema

**friction check:** no friction in the implementation. the onTalk codepath is symmetric with onBoot/onTool/onStop.

---

## what I found (non-issue)

**non-issue:** critical paths are frictionless.

**why it holds:**

| check | result |
|-------|--------|
| integration tests pass | yes — all onTalk tests pass |
| code follows extant patterns | yes — parallel to onBoot/onTool/onStop |
| no special cases | yes — onTalk uses same machinery |
| type system enforces coverage | yes — EVENT_MAP exhaustiveness check |

---

## conclusion

this review passes because:
- the critical paths follow extant patterns (no new friction introduced)
- integration tests verify the sync and del operations
- the type system enforces exhaustive treatment of onTalk
- no manual friction detected in code review
