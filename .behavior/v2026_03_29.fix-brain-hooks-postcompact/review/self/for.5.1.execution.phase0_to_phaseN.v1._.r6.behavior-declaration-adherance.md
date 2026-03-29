# self-review: behavior-declaration-adherance (r5)

## question

does the implementation match the spec correctly? any drift or misinterpretation?

## the review process

i read each changed file line by line and verified against the blueprint.

## file: translateHook.ts

### VALID_BOOT_EVENTS constant

**blueprint says:** "VALID_BOOT_EVENTS constant"

**code says:**
```ts
const VALID_BOOT_EVENTS = ['SessionStart', 'PreCompact', 'PostCompact'] as const;
```

**adherance check:** order matches blueprint table. `as const` is correct for literal union.

**why it holds:** the constant contains exactly the three events from the blueprint. no extra events, no omitted events.

### filter.what logic

**blueprint says:**
- no filter → SessionStart (backwards compat)
- filter.what = valid boot event → that event
- filter.what = '*' → return array of all boot events
- filter.what = invalid → throw UnexpectedCodePathError

**code says (lines 56-81):**
```ts
const bootTrigger = hook.filter?.what ?? 'SessionStart';

if (bootTrigger === '*') {
  return VALID_BOOT_EVENTS.map((event) => ({...}));
}

if (!VALID_BOOT_EVENTS.includes(bootTrigger as ...)) {
  throw new UnexpectedCodePathError(...);
}

return [{ event: bootTrigger, entry: buildEntry('*') }];
```

**adherance check:**
1. no filter → defaults to 'SessionStart' via nullish coalesce operator
2. wildcard → maps over VALID_BOOT_EVENTS, returns array
3. invalid → throws with metadata
4. valid → returns single-element array

**why it holds:** the codepath tree in blueprint matches the if-else structure exactly. order of checks is correct (wildcard before invalid check).

### return type

**blueprint says:** "return type changes from single to array"

**code says:**
```ts
}): Array<{ event: string; entry: ClaudeCodeHookEntry }> => {
```

**adherance check:** return type is array as specified.

**why it holds:** all return statements produce arrays (single-element or multi-element).

### reverse translation

**blueprint says:**
- PreCompact → onBoot + filter.what=PreCompact
- PostCompact → onBoot + filter.what=PostCompact
- SessionStart → onBoot (no filter)

**code says (lines 100-127):**
```ts
if (event === 'PreCompact' || event === 'PostCompact') {
  return entry.hooks.map((h) => ({
    ...
    filter: { what: event },
  }));
}

// ... later for SessionStart:
...(entry.matcher !== '*' && { filter: { what: entry.matcher } }),
```

**adherance check:**
1. PreCompact/PostCompact → sets filter.what to event name
2. SessionStart with matcher='*' → no filter (backwards compat)

**why it holds:** the reverse translation preserves the event type in filter.what for compact events, and omits filter for SessionStart (this preserves backwards compat).

## file: genBrainHooksAdapterForClaudeCode.ts

### upsert iteration

**blueprint says:** "upsert: iterate array return"

**code says (line 108):**
```ts
const translations = translateHookToClaudeCode({ hook });
// ...
for (const { event, entry } of translations) {
```

**adherance check:** upsert iterates over array return.

**why it holds:** the for-of loop processes each translation in the array, whether it's one (specific filter) or three (wildcard).

### del multi-bucket search

**blueprint says:** "del: use filter.what for bucket lookup" with note "for onBoot, search all boot event buckets"

**code says (lines 169-174):**
```ts
const claudeEvents: string[] =
  event === 'onBoot'
    ? ['SessionStart', 'PreCompact', 'PostCompact']
    : event === 'onTool' ? ['PreToolUse'] : ['Stop'];
```

**adherance check:** del searches all three boot buckets for onBoot hooks.

**why it holds:** since onBoot with filter.what=* creates hooks in all three buckets, del must search all three to remove them. the query contract has no filter info, so we must search all possibilities.

## file: config.dao.ts

**blueprint says:** "add PreCompact/PostCompact to ClaudeCodeSettings"

**code says:**
```ts
PreCompact?: ClaudeCodeHookEntry[];
PostCompact?: ClaudeCodeHookEntry[];
```

**adherance check:** both types are added as optional arrays.

**why it holds:** matches the extant pattern for SessionStart, PreToolUse, etc.

## file: howto.use.brain.hooks.md

**blueprint outline says:**
- .what
- .why
- .how with yaml example
- filter.what values table

**actual brief contains:**
- line 3-5: .what section
- line 119-124: .why section
- line 44-103: .how with 5 yaml examples
- line 32-42: filter.what values table

**adherance check:** all sections from outline are present.

**why it holds:** the brief covers all required content from the blueprint outline.

## file: readme.md

**blueprint says:** "add hooks row to inputs table"

**code says (line 517):**
```
| `hooks` | brain lifecycle hooks | [howto.use.brain.hooks](...) |
```

**adherance check:** row added with correct format.

**why it holds:** follows extant row format in the table.

## conclusion

no drift or misinterpretation found. implementation adheres to blueprint:

| spec item | implementation | adherance |
|-----------|----------------|-----------|
| VALID_BOOT_EVENTS | exact events | correct |
| filter.what logic | codepath tree matches | correct |
| array return type | Array<...> | correct |
| reverse translation | filter.what preserved | correct |
| upsert iteration | for-of loop | correct |
| del multi-bucket | all three buckets | correct |
| types | PreCompact/PostCompact | correct |
| supplier brief | all sections | correct |
| readme link | table row | correct |
