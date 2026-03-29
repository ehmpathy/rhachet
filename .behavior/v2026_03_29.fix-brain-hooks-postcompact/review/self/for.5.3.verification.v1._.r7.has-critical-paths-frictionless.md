# self-review: has-critical-paths-frictionless (r7)

## question

are the critical paths frictionless in practice?

## search for repros artifact

i ran `Glob pattern: .behavior/v2026_03_29.fix-brain-hooks-postcompact/3.2.distill.repros.experience.*.md`

**result:** no files found. no repros artifact exists.

## why no repros artifact exists

this behavior route followed:

```
0.wish.md → 1.vision.md → 2.1.criteria.blackbox.md → 3.1.3.research → 3.3.1.blueprint → execution → verification
```

the 3.2.distill.repros phase was skipped because:

1. **this is internal adapter code** — `translateHook.ts` is not user-visible
2. **no user journey to sketch** — users never interact with this code directly
3. **tests derive from criteria.blackbox.md** — functional requirements, not experience journeys

**the distinction:**

| feature type | critical path source | verification method |
|--------------|---------------------|---------------------|
| user-visible | repros (experience journeys) | manual walkthrough |
| internal adapter | criteria (functional requirements) | automated tests |

## what verification applies instead

for internal adapters, **automated tests** verify the critical code paths:

### code path 1: onBoot + filter.what=PostCompact

```
translateHookToClaudeCode({ hook: { event: 'onBoot', filter: { what: 'PostCompact' }, ... } })
  → returns [{ event: 'PostCompact', entry: ... }]
```

**verified by:** case5 in translateHook.test.ts (lines 113-137)

### code path 2: onBoot + filter.what=PreCompact

```
translateHookToClaudeCode({ hook: { event: 'onBoot', filter: { what: 'PreCompact' }, ... } })
  → returns [{ event: 'PreCompact', entry: ... }]
```

**verified by:** case6 in translateHook.test.ts (lines 139-159)

### code path 3: onBoot without filter (backwards compat)

```
translateHookToClaudeCode({ hook: { event: 'onBoot', ... } })
  → returns [{ event: 'SessionStart', entry: ... }]
```

**verified by:** case1 in translateHook.test.ts (lines 12-43)

### code path 4: onBoot + filter.what=*

```
translateHookToClaudeCode({ hook: { event: 'onBoot', filter: { what: '*' }, ... } })
  → returns [{ event: 'SessionStart' }, { event: 'PreCompact' }, { event: 'PostCompact' }]
```

**verified by:** case8 in translateHook.test.ts (lines 183-211)

### code path 5: invalid filter fails fast

```
translateHookToClaudeCode({ hook: { event: 'onBoot', filter: { what: 'Invalid' }, ... } })
  → throws UnexpectedCodePathError
```

**verified by:** case9 in translateHook.test.ts (lines 213-229)

## test execution verification

i ran `THOROUGH=true npm run test:unit -- src/_topublish/rhachet-brains-anthropic/src/hooks/ --verbose`

**result:** 4 test suites, 66 tests, all passed.

the critical code paths are exercised automatically on every test run. no manual walkthrough needed for internal adapter code.

## conclusion

- [x] searched for repros artifact — none exists (expected for internal adapter)
- [x] identified all critical code paths from criteria.blackbox.md
- [x] verified each code path has a dedicated test case
- [x] confirmed all tests pass

**why it holds:** critical path verification for internal adapters is done through automated tests, not manual walkthroughs. no repros artifact exists because users do not interact with this code. all 6 criteria usecases map to dedicated test cases that exercise the critical code paths. 66 tests pass.

