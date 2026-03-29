# self-review r9: has-role-standards-adherance

## fresh pass: implementation perspective

this review examines the blueprint from an implementation perspective. will the proposed changes produce code that adheres to mechanic standards?

---

## rule enumeration (implementation focus)

| briefs/ directory | implementation concern |
|-------------------|----------------------|
| code.prod/evolvable.procedures | arrow functions, input-context |
| code.prod/pitofsuccess.errors | fail-fast, error types |
| code.prod/pitofsuccess.typedefs | shapefit, no force-cast |
| code.prod/readable.narrative | no else branches, early returns |
| code.test/frames.behavior | given-when-then structure |
| lang.terms | treestruct, ubiqlang |

---

## implementation-level check

### will translateHookToClaudeCode follow arrow-only?

**blueprint says:** modify extant function

**extant code:** already an arrow function (`const translateHookToClaudeCode = (input: ...) => { ... }`)

**implementation:** extension preserves arrow syntax. no `function` keyword introduced.

**verdict:** holds. arrow pattern inherited from extant.

---

### will input-context pattern hold?

**blueprint says:** signature `(input: { hook: BrainHook })`

**extant code:** already follows `(input, context?)` pattern

**implementation:** no signature change needed. pattern preserved.

**verdict:** holds. pattern inherited.

---

### will fail-fast work correctly?

**blueprint says:** invalid filter.what throws UnexpectedCodePathError

**implementation concern:** where does the throw happen?

**blueprint codepath:**
```
├── no filter → SessionStart
├── filter.what = valid → that event
├── filter.what = '*' → array
└── filter.what = invalid → throw
```

the invalid case is last. this is fail-fast: after all valid paths exhausted, throw.

**verdict:** holds. fail-fast via exhaustive check.

---

### will else branches be introduced?

**blueprint codepath tree:**
```
├── no filter → SessionStart
├── filter.what = valid → that event
├── filter.what = '*' → array
└── filter.what = invalid → throw
```

this structure implies:
```ts
if (!filter) return SessionStart;
if (filter.what === '*') return allEvents;
if (isValidBootEvent(filter.what)) return thatEvent;
throw UnexpectedCodePathError;
```

**analysis:** flat conditionals with early returns. no else chains.

**verdict:** holds. structure enables else-free code.

---

### will shapefit be maintained?

**blueprint says:** return type changes from single object to array

**concern:** does this require force-cast?

**implementation:**
```ts
// before
return { event, entry };

// after
return [{ event, entry }];
// or for wildcard
return [
  { event: 'SessionStart', entry },
  { event: 'PreCompact', entry },
  { event: 'PostCompact', entry },
];
```

**analysis:** proper type signature update. return `Array<{ event, entry }>`. no cast needed.

**verdict:** holds. clean type evolution.

---

### will tests use given-when-then?

**blueprint test table:** shows input → expected output pairs

**implementation:** tests should follow:
```ts
given('onBoot hook with filter.what=PostCompact', () => {
  when('translated to claude code', () => {
    then('returns PostCompact event entry', () => {
      // assertion
    });
  });
});
```

**verdict:** holds. test cases map cleanly to given-when-then.

---

### will names follow treestruct?

**functions:**
- `translateHookToClaudeCode` — [verb][noun] ✓
- `translateHookFromClaudeCode` — [verb][noun] ✓

**no new functions introduced.** extends extant with same names.

**verdict:** holds. names unchanged.

---

## anti-pattern implementation check

### mutation risk

**concern:** will implementation mutate inputs?

**blueprint:** transforms input.hook into output entries. no mutation described.

**implementation:** should create new objects, not modify input.

**verdict:** holds if implementation uses spread/new objects.

---

### scope creep risk

**concern:** will implementation do more than specified?

**blueprint scope:**
- translateHook changes: event selection logic
- genBrainHooksAdapterForClaudeCode: iterate array, del bucket lookup
- config.dao: add types
- supplier brief: new file
- readme: one table row

**analysis:** each change is minimal and focused.

**verdict:** holds. no scope creep in blueprint.

---

### error type appropriateness

**concern:** is UnexpectedCodePathError correct for invalid filter.what?

**analysis:**
- BadRequestError = user input error
- UnexpectedCodePathError = internal configuration error

filter.what comes from role definition (yaml), not runtime user input. role authors control this value. an invalid value is a configuration error.

**verdict:** holds. error type matches the source.

---

## lessons

### lesson 1: inherited patterns simplify review

when a blueprint extends extant code, the extant code already follows standards. the review focuses on: does the extension preserve those patterns?

### lesson 2: codepath tree predicts structure

the blueprint's codepath tree shows the logical structure. translate to code mentally:
- branches = if statements
- leaves = returns or throws
- flat tree = no nesting = no else

### lesson 3: type changes need type solutions

return type change (single → array) needs proper signature update, not cast. if a cast would be needed, that signals a design flaw.

---

## final verdict

| implementation aspect | adherance |
|----------------------|-----------|
| arrow functions | inherited |
| input-context pattern | inherited |
| fail-fast | yes |
| no else branches | yes |
| shapefit (no cast) | yes |
| given-when-then tests | yes |
| treestruct names | inherited |
| no mutation | expected |
| no scope creep | yes |
| error type | correct |

**verdict: ADHERES** — blueprint will produce implementation that follows mechanic standards.

