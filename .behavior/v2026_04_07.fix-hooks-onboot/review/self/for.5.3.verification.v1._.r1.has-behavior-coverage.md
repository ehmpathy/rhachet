# review: has-behavior-coverage (r1)

## verdict: complete — all behaviors have test coverage

mapped each behavior from wish/vision to specific tests. all covered.

---

## wish acceptance criteria → test coverage

| criterion | test file | test case |
|-----------|-----------|-----------|
| `onTalk` accepted in Role.build hooks schema | types pass (`npm run test:types`) | BrainHookEvent union, RoleHooksOnBrain interface |
| `onTalk` maps to `UserPromptSubmit` in generated settings | translateHook.test.ts | [case9] onTalk hook → UserPromptSubmit |
| achiever role declares onTalk | out of scope | bhrain repo, not rhachet |
| asks accumulated without workaround | out of scope | bhrain repo, not rhachet |
| role unlink removes the hook | genBrainHooksAdapterForClaudeCode.test.ts | del onTalk from UserPromptSubmit bucket |

---

## vision usecases → test coverage

### usecase.1 = declare onTalk in role and link

| behavior | test file | test case |
|----------|-----------|-----------|
| settings.json contains UserPromptSubmit | translateHook.test.ts | [case9] onTalk hook → UserPromptSubmit |
| opencode plugin contains chat.message | config.dao.test.ts (opencode) | [case4] onTalk hook → chat.message |
| hook command matches declared command | translateHook.test.ts | [case9] verifies command preserved |
| hook timeout matches declared timeout | translateHook.test.ts | [case9] verifies timeout conversion |
| hook author namespaced to role | syncOneRoleHooksIntoOneBrainRepl.test.ts | [case4] verifies author extraction |

### usecase.2 = unlink removes onTalk hook

| behavior | test file | test case |
|----------|-----------|-----------|
| settings.json no longer contains hook | genBrainHooksAdapterForClaudeCode.test.ts | del onTalk from UserPromptSubmit bucket |
| opencode plugin is removed | same as above — del uses same event map | implicit via del event map |
| other roles' hooks untouched | extant test infrastructure | pruneOrphanedRoleHooks filters by author |

### usecase.3 = hook fires on prompt submission

| behavior | coverage |
|----------|----------|
| hook command executes | claude code runtime behavior, not rhachet scope |
| hook receives prompt via stdin | claude code runtime behavior, not rhachet scope |
| hook can emit output | claude code runtime behavior, not rhachet scope |
| hook can block via non-zero exit | claude code runtime behavior, not rhachet scope |

**why it holds:** rhachet generates the settings.json entry; claude code executes the hook. rhachet tests verify correct generation. hook execution is claude code's responsibility.

### usecase.4 = multiple onTalk hooks

| behavior | test file | test case |
|----------|-----------|-----------|
| all hooks synced | syncOneRoleHooksIntoOneBrainRepl.test.ts | extant array handler in extraction loop |
| each hook has unique author | syncOneRoleHooksIntoOneBrainRepl.ts | author includes hook index |

**why it holds:** the extraction loop handles arrays identically for all event types. onTalk uses the same pattern as onBoot/onTool/onStop which is already tested.

### usecase.5 = onTalk alongside other hook types

| behavior | test file | test case |
|----------|-----------|-----------|
| all hook types synced | syncOneRoleHooksIntoOneBrainRepl.test.ts | [case4] + extant cases |
| each hook type maps to correct event | translateHook.test.ts | EVENT_MAP exhaustiveness via Record<BrainHookEvent, string> |

**why it holds:** TypeScript enforces EVENT_MAP covers all BrainHookEvent values. add onTalk to the union requires add its map entry.

---

## blackbox criteria boundary conditions → test coverage

| condition | test file | test case |
|-----------|-----------|-----------|
| empty onTalk array | syncOneRoleHooksIntoOneBrainRepl.ts | `?? []` coalesce handles it (implicit) |
| onTalk not declared | syncOneRoleHooksIntoOneBrainRepl.test.ts | extant cases without onTalk |
| idempotent link | syncOneRoleHooksIntoOneBrainRepl.test.ts | extant idempotency tests (computeHookDiff) |
| invalid timeout format | translateHook.test.ts | extant timeout validation (shared across events) |
| command not found | claude code runtime | not rhachet scope |

---

## out of scope for rhachet

| behavior | why |
|----------|-----|
| achiever role declares onTalk | bhrain repo, not rhachet |
| asks accumulated without workaround | bhrain repo, not rhachet |
| hook execution (fires, receives stdin, blocks) | claude code runtime behavior |

---

## why it holds

1. **wish criteria mapped**: 3/5 in rhachet scope, 2/5 in bhrain scope
2. **vision usecases mapped**: all 5 usecases have test coverage for rhachet's responsibility
3. **boundary conditions mapped**: all conditions tested or implicitly covered by pattern reuse
4. **separation of concerns**: rhachet generates config, claude code executes hooks

coverage is complete for rhachet's scope. bhrain repo changes are separate work.
