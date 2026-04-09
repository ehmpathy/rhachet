# self-review r11: has-role-standards-adherance

## what i reviewed

i enumerated the mechanic briefs directories relevant to this blueprint, then checked each proposed change against the standards.

---

## relevant briefs directories

the blueprint proposes changes to:
- domain.objects (types and interfaces)
- domain.operations (orchestration)
- _topublish adapters (transformers and communicators)
- tests

relevant mechanic briefs:

| directory | why relevant |
|-----------|--------------|
| practices/code.prod/evolvable.domain.objects/ | type definitions, nullable rules |
| practices/code.prod/evolvable.domain.operations/ | get/set/gen verbs, core variants |
| practices/code.prod/evolvable.procedures/ | input-context pattern, arrow functions |
| practices/code.prod/readable.narrative/ | narrative flow, no decode-friction |
| practices/code.test/frames.behavior/ | given/when/then, test coverage |
| practices/lang.terms/ | treestruct, ubiqlang, gerund prohibition |

---

## standard checks

### 1. domain.objects standards

**rule.forbid.undefined-attributes:**
- blueprint adds `onTalk?: RoleHookOnBrain[]` as optional property
- optional is correct — roles may not declare onTalk hooks
- follows extant pattern for onBoot/onTool/onStop
- **holds:** optional array is valid; undefined means "not declared"

**rule.require.immutable-refs:**
- no refs are added; onTalk is an array of hooks
- **holds:** no violation

### 2. domain.operations standards

**rule.require.get-set-gen-verbs:**
- extractDeclaredHooks is not get/set/gen — it's an internal helper
- the function is private to syncOneRoleHooksIntoOneBrainRepl
- **holds:** helper functions within orchestrators need not follow verb pattern

**define.domain-operation-grains:**
- translateHook.ts is a transformer (pure, no i/o)
- config.dao.ts is a communicator (i/o boundary)
- syncOneRoleHooksIntoOneBrainRepl.ts is an orchestrator (composes)
- **holds:** each file stays within its grain

### 3. procedure standards

**rule.require.input-context-pattern:**
- blueprint does not add new procedures, only extends extant ones
- extant procedures already use (input, context) pattern
- **holds:** no new violations

**rule.require.arrow-only:**
- blueprint adds for-loops (not new functions)
- extant functions are arrow functions
- **holds:** no new violations

### 4. narrative standards

**rule.forbid.inline-decode-friction:**
- blueprint adds simple if-branches and for-loops
- no complex inline transformations
- **holds:** no decode-friction

**rule.forbid.else-branches:**
- blueprint extends ternary chain (not else)
- getHookImplementation uses sequential if-returns
- **holds:** no else branches

### 5. test standards

**rule.require.given-when-then:**
- test tree shows `given('[caseN] ...')` pattern
- blueprint declares test cases with [caseN] labels
- **holds:** follows bdd pattern

**rule.require.test-coverage-by-grain:**
- translateHook (transformer) → unit tests
- config.dao (communicator) → integration tests
- genBrainHooksAdapter (communicator) → integration tests
- syncOneRoleHooks (orchestrator) → integration tests
- **holds:** correct test types for each grain

### 6. term standards

**rule.forbid.gerunds:**
- blueprint uses "extraction" (noun) not "extract" as gerund
- "extraction block" is acceptable — extraction is a noun
- **holds:** no gerund violations in blueprint

**rule.require.ubiqlang:**
- onTalk follows extant name pattern (on + noun)
- UserPromptSubmit is claude code's official term
- chat.message is opencode's official term
- **holds:** uses canonical terms

---

## anti-pattern checks

| anti-pattern | present? | notes |
|--------------|----------|-------|
| barrel exports | no | no index.ts changes |
| positional args | no | extant signatures preserved |
| mocks in tests | no | integration tests use real deps |
| decode-friction | no | simple control flow |
| else branches | no | sequential if-returns |
| gerunds | no | noun forms used |

---

## deviations found

none. the blueprint:
- follows domain object standards (optional arrays)
- follows domain operation grains (transformer/communicator/orchestrator)
- follows procedure standards (input-context, arrow functions)
- follows narrative standards (no decode-friction, no else)
- follows test standards (given/when/then, correct test types)
- follows term standards (no gerunds, canonical terms)

---

## verdict

**PASSED.** the blueprint adheres to mechanic role standards. no violations or anti-patterns found.
