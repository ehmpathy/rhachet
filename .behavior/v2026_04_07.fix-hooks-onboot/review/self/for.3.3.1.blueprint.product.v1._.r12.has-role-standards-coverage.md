# self-review r12: has-role-standards-coverage

## what i reviewed

i enumerated the mechanic standards that should be present in this blueprint, then verified each is covered — either by the blueprint's declared changes or by extant code.

---

## relevant briefs directories

| directory | coverage needed? | why |
|-----------|------------------|-----|
| code.prod/evolvable.domain.objects/ | yes | type definitions |
| code.prod/evolvable.domain.operations/ | yes | orchestration logic |
| code.prod/evolvable.procedures/ | yes | function signatures |
| code.prod/readable.narrative/ | yes | code structure |
| code.prod/pitofsuccess.errors/ | check | error paths |
| code.prod/pitofsuccess.typedefs/ | check | type safety |
| code.test/frames.behavior/ | yes | test structure |
| code.test/scope.coverage/ | yes | test types |

---

## coverage checks

### 1. error path coverage

**rule.require.failfast:**
- does the blueprint add any error paths that need fail-fast?
- **analysis:** the blueprint adds entries to maps and arrays. no new error paths.
- the extant code already has error handlers:
  - translateHook.ts line 63: `throw new UnexpectedCodePathError` for invalid filter.what
  - genBrainHooksAdapterForClaudeCode has error handler for invalid events
- **covered:** no new error paths needed; extant error handler covers onTalk automatically

**rule.require.failloud:**
- extant errors use `UnexpectedCodePathError` with context objects
- no new error messages needed for onTalk
- **covered:** extant error handler is sufficient

### 2. type safety coverage

**rule.require.shapefit:**
- blueprint adds `'onTalk'` to `BrainHookEvent` union
- blueprint adds `onTalk?: RoleHookOnBrain[]` to interface
- **covered:** type system will enforce correct usage after change

**rule.forbid.as-cast:**
- blueprint does not propose any type casts
- **covered:** no violations

### 3. test coverage by grain

**rule.require.test-coverage-by-grain:**

| file | grain | blueprint declares test? | test type? |
|------|-------|-------------------------|------------|
| translateHook.ts | transformer | ✓ [case9], [case8] | unit tests |
| config.dao.ts (anthropic) | communicator | implicit (schema change) | n/a |
| genBrainHooksAdapterForClaudeCode.ts | communicator | ✓ [caseN] | integration |
| syncOneRoleHooksIntoOneBrainRepl.ts | orchestrator | ✓ [case4] | integration |
| config.dao.ts (opencode) | communicator | ✓ [case3], [case4] | integration |

- **covered:** all codepaths have appropriate test coverage declared

### 4. validation coverage

**question:** does onTalk need validation like onBoot has for filter.what?

**analysis:**
- onBoot validates filter.what because it maps to multiple claude code events (SessionStart, PreCompact, PostCompact)
- onTalk maps to exactly one event (UserPromptSubmit) — no filter.what needed
- the vision states: "filter.what is not supported (single event, no sub-events)"

**covered:** no validation needed; blueprint correctly omits filter support for onTalk

### 5. idempotency coverage

**rule.require.idempotent-procedures:**
- sync procedures must be idempotent
- extant sync logic prunes then re-adds hooks
- **covered:** extant idempotency pattern handles onTalk automatically

### 6. snapshot coverage

**rule.require.snapshots for contracts:**
- does the blueprint change any contract outputs?
- **analysis:** the blueprint changes internal hook machinery, not contract outputs
- contract outputs (settings.json structure, plugin content) are already tested by extant snapshot tests
- new onTalk entries will be captured in extant snapshots in test execution

**covered:** extant snapshot tests will capture onTalk changes

---

## absent practices check

| practice | present? | notes |
|----------|----------|-------|
| error paths | ✓ | extant covers onTalk |
| type definitions | ✓ | BrainHookEvent, RoleHooksOnBrain |
| input validation | ✓ | no filter.what needed for onTalk |
| test coverage | ✓ | all codepaths declared |
| idempotency | ✓ | extant sync is idempotent |
| snapshots | ✓ | extant snapshots will capture |

---

## verdict

**PASSED.** all relevant mechanic standards are covered:
- no new error paths needed (extant covers onTalk)
- type definitions are declared
- no validation needed (single event, no sub-events)
- all codepaths have test coverage declared
- extant idempotency and snapshots cover onTalk automatically
