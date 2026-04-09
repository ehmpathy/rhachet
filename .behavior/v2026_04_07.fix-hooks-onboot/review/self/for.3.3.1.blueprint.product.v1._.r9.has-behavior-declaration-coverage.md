# self-review r9: has-behavior-declaration-coverage

## what i reviewed

i traced each requirement from vision and criteria to the blueprint, then verified each is covered by a filediff or test.

---

## vision requirements → blueprint coverage

from vision (lines 184-190), implementation needs:

| requirement | blueprint filediff | covered? |
|-------------|-------------------|----------|
| `BrainHookEvent` type — add `'onTalk'` | `src/domain.objects/BrainHookEvent.ts` | ✓ |
| `RoleHooksOnBrain` interface — add `onTalk` property | `src/domain.objects/RoleHooksOnBrain.ts` | ✓ |
| `extractDeclaredHooks` — add onTalk extraction block | `src/domain.operations/brains/syncOneRoleHooksIntoOneBrainRepl.ts` | ✓ |
| claude code `EVENT_MAP` — add `onTalk: 'UserPromptSubmit'` | `src/_topublish/rhachet-brains-anthropic/src/hooks/translateHook.ts` | ✓ |
| opencode adapter — add `onTalk: 'chat.message'` map | `src/_topublish/rhachet-brains-opencode/src/hooks/config.dao.ts` | ✓ |
| `ClaudeCodeSettings` schema — add `UserPromptSubmit` event type | `src/_topublish/rhachet-brains-anthropic/src/hooks/config.dao.ts` | ✓ |

**all 6 vision requirements mapped to filediffs.**

---

## criteria usecases → blueprint coverage

### usecase.1 = declare onTalk in role and link

| criterion | blueprint coverage |
|-----------|-------------------|
| settings.json contains UserPromptSubmit hook | ✓ translateHook.ts EVENT_MAP + config.dao.ts schema |
| opencode plugin contains chat.message hook | ✓ config.dao.ts (opencode) getHookImplementation |
| hook command matches declared command | ✓ extant translateHook logic, no change needed |
| hook timeout matches declared timeout | ✓ extant translateHook logic, no change needed |
| hook author is namespaced to role | ✓ extant author logic, no change needed |

### usecase.2 = unlink removes onTalk hook

| criterion | blueprint coverage |
|-----------|-------------------|
| settings.json no longer contains the hook | ✓ genBrainHooksAdapterForClaudeCode.ts del event map |
| opencode plugin is removed | ✓ extant del logic + regex extension |
| other roles' hooks remain untouched | ✓ extant author namespace logic |

### usecase.3 = hook fires on prompt submission

| criterion | blueprint coverage |
|-----------|-------------------|
| hook command executes | ✓ claude code runtime behavior (no rhachet change) |
| hook receives prompt content via stdin | ✓ claude code runtime behavior (no rhachet change) |
| hook can emit output | ✓ claude code runtime behavior (no rhachet change) |
| hook can block prompt via non-zero exit | ✓ claude code runtime behavior (no rhachet change) |

**note:** usecase.3 criteria are claude code runtime behavior, not rhachet sync behavior. rhachet's job is to sync the hook declaration correctly — verified via usecase.1.

### usecase.4 = multiple onTalk hooks

| criterion | blueprint coverage |
|-----------|-------------------|
| all hooks are synced to settings.json | ✓ extant array iteration in extractDeclaredHooks |
| each hook has unique author namespace | ✓ extant author logic, no change needed |

### usecase.5 = onTalk alongside other hook types

| criterion | blueprint coverage |
|-----------|-------------------|
| all hook types are synced | ✓ parallel for-loop structure in extractDeclaredHooks |
| each hook type maps to correct brain event | ✓ EVENT_MAP entries for each type |

---

## boundary conditions → blueprint coverage

| condition | blueprint coverage |
|-----------|-------------------|
| empty onTalk array | ✓ extant `?? []` fallback in extractDeclaredHooks |
| onTalk not declared | ✓ extant `??` operator: `onBrain.onTalk ?? []` |
| idempotent link | ✓ extant upsert logic in sync, no change needed |

---

## error cases → blueprint coverage

| error case | blueprint coverage |
|------------|-------------------|
| invalid timeout | ✓ extant validation in translateHook |
| command not found | ✓ claude code runtime error (not rhachet) |

---

## test coverage for criteria

| usecase | test declared? |
|---------|----------------|
| usecase.1 (link) | ✓ syncOneRoleHooksIntoOneBrainRepl.test.ts [case4] |
| usecase.2 (unlink) | ✓ genBrainHooksAdapterForClaudeCode.test.ts [caseN] |
| usecase.3 (fires) | n/a — claude code runtime, not rhachet |
| usecase.4 (multiple) | ✓ covered by usecase.1 array iteration |
| usecase.5 (alongside) | ✓ covered by extant tests for other events |

---

## verdict

**PASSED.** all vision requirements, criteria usecases, boundary conditions, and error cases are covered by the blueprint's filediff tree and test tree. no gaps found.
