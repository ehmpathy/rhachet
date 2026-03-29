# self-review: behavior-declaration-coverage (r5)

## question

does the implementation cover all requirements from vision, criteria, and blueprint?

## the review process

i opened each behavior artifact and traced line-by-line against the code:
1. read 2.1.criteria.blackbox.md — 6 usecases
2. read 3.3.1.blueprint.product.v1.i1.md — filediff tree, contracts
3. verified each against translateHook.ts, translateHook.test.ts, config.dao.ts
4. verified supplier brief content and readme link

## criteria coverage

### usecase.1: hook fires only on PostCompact

**requirement:**
```
given(role declares onBoot hook with filter.what=PostCompact)
  when(role hooks are synced to claude code)
    then(hook is registered under PostCompact event)
```

**code:** translateHook.ts line 80
```ts
return [{ event: bootTrigger, entry: buildEntry('*') }];
```

**test:** translateHook.test.ts case5 (lines 113-137)
```ts
given('[case5] onBoot hook with filter.what=PostCompact', () => {
  ...
  then('event is PostCompact', () => {
    expect(result[0]?.event).toEqual('PostCompact');
  });
});
```

**verdict:** covered.

### usecase.2: hook fires only on PreCompact

**requirement:**
```
given(role declares onBoot hook with filter.what=PreCompact)
  when(role hooks are synced to claude code)
    then(hook is registered under PreCompact event)
```

**code:** same as usecase.1 (line 80)

**test:** translateHook.test.ts case6 (lines 139-159)
```ts
given('[case6] onBoot hook with filter.what=PreCompact', () => {
  ...
  then('event is PreCompact', () => {
    expect(result[0]?.event).toEqual('PreCompact');
  });
});
```

**verdict:** covered.

### usecase.3: backwards compat - no filter = SessionStart only

**requirement:**
```
given(role declares onBoot hook without filter)
  when(role hooks are synced to claude code)
    then(hook is registered under SessionStart event)
```

**code:** translateHook.ts line 57
```ts
const bootTrigger = hook.filter?.what ?? 'SessionStart';
```

**test:** translateHook.test.ts case1 (lines 12-43)
```ts
given('[case1] onBoot hook without filter', () => {
  ...
  then('event is SessionStart', () => {
    expect(result[0]?.event).toEqual('SessionStart');
  });
});
```

**verdict:** covered.

### usecase.4: explicit SessionStart filter

**requirement:**
```
given(role declares onBoot hook with filter.what=SessionStart)
  when(role hooks are synced to claude code)
    then(hook is registered under SessionStart event)
```

**code:** line 80 handles this (bootTrigger = 'SessionStart')

**test:** translateHook.test.ts case7 (lines 161-181)
```ts
given('[case7] onBoot hook with filter.what=SessionStart', () => {
  ...
  then('event is SessionStart', () => {
    expect(result[0]?.event).toEqual('SessionStart');
  });
});
```

**verdict:** covered.

### usecase.5: wildcard filter fires on all boot events

**requirement:**
```
given(role declares onBoot hook with filter.what=*)
  when(role hooks are synced to claude code)
    then(hook is registered under SessionStart event)
    then(hook is registered under PreCompact event)
    then(hook is registered under PostCompact event)
```

**code:** translateHook.ts lines 60-65
```ts
if (bootTrigger === '*') {
  return VALID_BOOT_EVENTS.map((event) => ({
    event,
    entry: buildEntry('*'),
  }));
}
```

**test:** translateHook.test.ts case8 (lines 183-211)
```ts
given('[case8] onBoot hook with filter.what=*', () => {
  ...
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
});
```

**verdict:** covered.

### usecase.6: invalid filter value fails fast

**requirement:**
```
given(role declares onBoot hook with filter.what=InvalidValue)
  when(role hooks are synced to claude code)
    then(sync fails with clear error)
```

**code:** translateHook.ts lines 68-77
```ts
if (!VALID_BOOT_EVENTS.includes(bootTrigger as ...)) {
  throw new UnexpectedCodePathError(
    `invalid filter.what value for onBoot: ${bootTrigger}`,
    { hook, validValues: VALID_BOOT_EVENTS },
  );
}
```

**test:** translateHook.test.ts case9 (lines 213-229)
```ts
given('[case9] onBoot hook with invalid filter.what', () => {
  ...
  then('throws UnexpectedCodePathError', () => {
    expect(() => translateHookToClaudeCode({ hook })).toThrow(
      'invalid filter.what value for onBoot: InvalidEvent',
    );
  });
});
```

**verdict:** covered.

## blueprint coverage

### types: PreCompact/PostCompact in ClaudeCodeSettings

**requirement:** add PreCompact and PostCompact to ClaudeCodeSettings

**verified:** read config.dao.ts — the interface now includes:
```ts
PreCompact?: ClaudeCodeHookEntry[];
PostCompact?: ClaudeCodeHookEntry[];
```

**why it holds:** these types enable typescript to type-check hook buckets for the new events.

### supplier brief

**requirement:** document how to register PostCompact hooks

**verified:** read `.agent/repo=.this/role=user/briefs/brains/howto.use.brain.hooks.md`
- line 32-42: filter.what values table with all options
- line 56-66: example of PostCompact hook
- line 68-78: example of PreCompact hook
- line 105-117: claude code translation table

**why it holds:** the brief covers all filter.what values, includes examples for each use case, and documents the translation to claude code format.

### readme link

**requirement:** add brief to brains section of readme

**verified:** grep found readme.md line 517:
```
| `hooks` | brain lifecycle hooks | [howto.use.brain.hooks](...) |
```

**why it holds:** the hooks row is in the inputs table, consistent with other supplier brief links.

## reverse translation coverage

blueprint specifies reverse translation to read hooks back from claude code.

### PostCompact → onBoot + filter.what=PostCompact

**verified:** translateHookFromClaudeCode lines 100-108:
```ts
if (event === 'PreCompact' || event === 'PostCompact') {
  return entry.hooks.map((h) => ({
    ...
    filter: { what: event },
  }));
}
```

**test:** case5 at lines 340-365 verifies `filter.what` is set to 'PostCompact'

**why it holds:** the code explicitly checks for PreCompact/PostCompact events and sets the filter.what to preserve the event type.

### PreCompact → onBoot + filter.what=PreCompact

**verified:** same code path as PostCompact (lines 100-108)

**test:** case6 at lines 367-394 verifies `filter.what` is set to 'PreCompact'

**why it holds:** both compact events use the same codepath — the event name is preserved in filter.what.

### SessionStart → onBoot (no filter)

**verified:** lines 118-127 — SessionStart maps to onBoot. the condition at line 124:
```ts
...(entry.matcher !== '*' && { filter: { what: entry.matcher } }),
```

this means for SessionStart with matcher='*', no filter is set (backwards compat).

**test:** case1 at lines 233-266 verifies onBoot with no filter.what

**why it holds:** the backwards compat requirement is preserved — SessionStart hooks read back without filter, just like they were before this change.

## conclusion

all requirements from the behavior declaration are covered:

| requirement | code | test |
|-------------|------|------|
| usecase.1 PostCompact | line 80 | case5 |
| usecase.2 PreCompact | line 80 | case6 |
| usecase.3 backwards compat | line 57 | case1 |
| usecase.4 explicit SessionStart | line 80 | case7 |
| usecase.5 wildcard | lines 60-65 | case8 |
| usecase.6 invalid fails | lines 68-77 | case9 |
| types | config.dao.ts | compile |
| supplier brief | howto.use.brain.hooks.md | - |
| readme link | readme.md | - |
| reverse PostCompact | lines 100-108 | case5 |
| reverse PreCompact | lines 100-108 | case6 |
| reverse SessionStart | lines 118-127 | case1 |

no gaps found.
