# self-review: has-journey-tests-from-repros (r5)

## question

did i implement each journey test from the repros artifact?

## search for repros artifact

```
Glob pattern: 3.2.distill.repros.experience.*.md
Result: no files found
```

**result:** no repros artifact exists in this behavior route.

## why no repros artifact

i read the behavior directory structure. this route followed:

```
0.wish.md → 1.vision.md → 2.1.criteria.blackbox.md → 3.1.3.research → 3.3.1.blueprint → execution → verification
```

the 3.2.distill.repros phase was skipped because:
1. this is internal adapter code (translateHook.ts)
2. no user journey to sketch — users never interact with this code directly
3. tests were derived from criteria.blackbox.md instead

**why it holds:** repros distillation is for user-visible journeys. this behavior is pure adapter translation logic. criteria.blackbox.md serves as the test source.

## criteria-to-test map (line-by-line)

i read 2.1.criteria.blackbox.md and translateHook.test.ts to verify direct correspondence:

### usecase.1 → case5 (lines 113-137)

**criteria:**
```
given(role declares onBoot hook with filter.what=PostCompact)
  when(role hooks are synced to claude code)
    then(hook is registered under PostCompact event)
```

**test (line 113-137):**
```ts
given('[case5] onBoot hook with filter.what=PostCompact', () => {
  const hook: BrainHook = { event: 'onBoot', filter: { what: 'PostCompact' }, ... };
  when('[t0] translated', () => {
    then('event is PostCompact', () => {
      expect(result[0]?.event).toEqual('PostCompact');
    });
  });
});
```

**BDD structure:** given/when/then ✓

### usecase.2 → case6 (lines 139-159)

**criteria:**
```
given(role declares onBoot hook with filter.what=PreCompact)
  when(role hooks are synced to claude code)
    then(hook is registered under PreCompact event)
```

**test (line 155-156):**
```ts
then('event is PreCompact', () => {
  expect(result[0]?.event).toEqual('PreCompact');
});
```

**BDD structure:** given/when/then ✓

### usecase.3 → case1 (lines 12-43)

**criteria:**
```
given(role declares onBoot hook without filter)
  then(hook is registered under SessionStart event)
```

**test (line 27-28):**
```ts
then('event is SessionStart', () => {
  expect(result[0]?.event).toEqual('SessionStart');
});
```

**BDD structure:** given/when/then ✓

### usecase.4 → case7 (lines 161-181)

**criteria:**
```
given(role declares onBoot hook with filter.what=SessionStart)
  then(hook is registered under SessionStart event)
```

**test (line 177-178):**
```ts
then('event is SessionStart', () => {
  expect(result[0]?.event).toEqual('SessionStart');
});
```

**BDD structure:** given/when/then ✓

### usecase.5 → case8 (lines 183-211)

**criteria:**
```
given(role declares onBoot hook with filter.what=*)
  then(hook is registered under SessionStart event)
  then(hook is registered under PreCompact event)
  then(hook is registered under PostCompact event)
```

**test (lines 195-209):**
```ts
then('returns array with three entries', () => {
  expect(result).toHaveLength(3);
});
then('has SessionStart event', () => {
  expect(result.map((r) => r.event)).toContain('SessionStart');
});
then('has PreCompact event', () => {
  expect(result.map((r) => r.event)).toContain('PreCompact');
});
then('has PostCompact event', () => {
  expect(result.map((r) => r.event)).toContain('PostCompact');
});
```

**BDD structure:** given/when/then ✓

### usecase.6 → case9 (lines 213-229)

**criteria:**
```
given(role declares onBoot hook with filter.what=InvalidValue)
  then(sync fails with clear error)
```

**test (lines 223-226):**
```ts
then('throws UnexpectedCodePathError', () => {
  expect(() => translateHookToClaudeCode({ hook })).toThrow(
    'invalid filter.what value for onBoot: InvalidEvent',
  );
});
```

**BDD structure:** given/when/then ✓

## verification summary

| criteria usecase | test case | lines | given/when/then | verified |
|------------------|-----------|-------|-----------------|----------|
| usecase.1 | case5 | 113-137 | YES | ✓ |
| usecase.2 | case6 | 139-159 | YES | ✓ |
| usecase.3 | case1 | 12-43 | YES | ✓ |
| usecase.4 | case7 | 161-181 | YES | ✓ |
| usecase.5 | case8 | 183-211 | YES | ✓ |
| usecase.6 | case9 | 213-229 | YES | ✓ |

## conclusion

- [x] no repros artifact exists — expected for internal adapter work
- [x] tests derived from criteria.blackbox.md instead
- [x] all 6 criteria usecases have dedicated test cases
- [x] all tests follow BDD given/when/then structure
- [x] line numbers verified by file read

**why it holds:** repros is for user journeys; this is internal adapter. criteria.blackbox.md is the authoritative test source, and all 6 usecases are covered with proper BDD structure.

