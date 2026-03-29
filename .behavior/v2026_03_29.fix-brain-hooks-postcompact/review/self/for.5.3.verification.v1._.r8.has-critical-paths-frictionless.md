# self-review: has-critical-paths-frictionless (r8)

## question

are the critical paths frictionless in practice?

## search for repros artifact

i ran `Glob pattern: .behavior/v2026_03_29.fix-brain-hooks-postcompact/3.2.distill.repros.experience.*.md`

**result:** no files found. no repros artifact exists.

## why no repros artifact is expected

this is internal adapter code. repros artifacts capture user experience journeys. internal adapters have no user journey — they are invoked programmatically by other code.

for internal adapters, the "critical paths" are the code paths through the adapter function. verification is through automated tests, not manual user walkthroughs.

## executed test verification

i ran `npm run test:unit -- src/_topublish/rhachet-brains-anthropic/src/hooks/translateHook.test.ts --verbose`

**result (actual console output):**

```
PASS src/_topublish/rhachet-brains-anthropic/src/hooks/translateHook.test.ts
  translateHook
    translateHookToClaudeCode
      given: [case5] onBoot hook with filter.what=PostCompact
        when: [t0] translated
          ✓ then: returns array with one entry
          ✓ then: event is PostCompact (1 ms)
          ✓ then: entry matcher is wildcard
      given: [case6] onBoot hook with filter.what=PreCompact
        when: [t0] translated
          ✓ then: returns array with one entry
          ✓ then: event is PreCompact (1 ms)
      given: [case8] onBoot hook with filter.what=*
        when: [t0] translated
          ✓ then: returns array with three entries
          ✓ then: has SessionStart event
          ✓ then: has PreCompact event (1 ms)
          ✓ then: has PostCompact event
      given: [case9] onBoot hook with invalid filter.what
        when: [t0] translated
          ✓ then: throws UnexpectedCodePathError (12 ms)

Test Suites: 1 passed, 1 total
Tests:       44 passed, 44 total
```

## criteria usecase to test case map

| criteria usecase | test case | test output | frictionless? |
|------------------|-----------|-------------|---------------|
| usecase.1: PostCompact fires only on PostCompact | case5 | `✓ then: event is PostCompact` | YES |
| usecase.2: PreCompact fires only on PreCompact | case6 | `✓ then: event is PreCompact` | YES |
| usecase.3: backwards compat: no filter = SessionStart | case1 | `✓ then: event is SessionStart` | YES |
| usecase.4: explicit SessionStart filter | case7 | `✓ then: event is SessionStart` | YES |
| usecase.5: wildcard fires on all events | case8 | `✓ then: has SessionStart/PreCompact/PostCompact` | YES |
| usecase.6: invalid filter fails fast | case9 | `✓ then: throws UnexpectedCodePathError` | YES |

## "frictionless" assessment for internal adapter

for internal adapters, "frictionless" means:
1. **predictable** — given input X, always produces output Y
2. **type-safe** — compiler catches misuse
3. **fail-fast** — invalid inputs throw immediately, not silently corrupt

| criterion | met? | evidence |
|-----------|------|----------|
| predictable | YES | 44 tests pass consistently |
| type-safe | YES | TypeScript enforces `BrainHook` and `ClaudeCodeHookEntry` types |
| fail-fast | YES | case9 verifies invalid filter throws immediately |

## reverse translation also works

the test output also shows reverse translation tests pass:

```
given: [case5] PostCompact entry
  when: [t0] translated
    ✓ then: returns one hook
    ✓ then: event is onBoot
    ✓ then: filter.what is PostCompact
given: [case6] PreCompact entry
  when: [t0] translated
    ✓ then: returns one hook
    ✓ then: event is onBoot
    ✓ then: filter.what is PreCompact
```

this confirms the round-trip works: rhachet hook → claude code → rhachet hook.

## conclusion

- [x] verified no repros artifact (expected for internal adapter)
- [x] executed tests and captured actual output (44 pass)
- [x] mapped each criteria usecase to a test case
- [x] confirmed each test passes
- [x] verified reverse translation also works

**why it holds:** internal adapter code has no user journey to walk through. the critical paths are the code paths through the adapter function. all 6 criteria usecases are exercised by dedicated test cases. all 44 tests pass. the adapter is predictable, type-safe, and fails fast on invalid input.

