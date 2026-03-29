# self-review r5: has-consistent-mechanisms

## search for extant mechanisms

### mechanism 1: EVENT_MAP

**searched for:** `EVENT_MAP`

**found:**
- `translateHook.ts:12` — declares `EVENT_MAP: Record<BrainHookEvent, string>`
- `genBrainHooksAdapterForClaudeCode.ts:159` — duplicate declaration in del method

**blueprint proposes:** extend EVENT_MAP logic to handle filter.what for onBoot

**why it holds:** EVENT_MAP already exists. the blueprint adds conditional logic around it (check filter.what when event is onBoot). we did not create a new constant or abstraction. we extended the interpretation of an extant mechanism.

---

### mechanism 2: BOOT_EVENTS array

**searched for:** `BOOT_EVENTS`, `bootEvents`, `boot.*events`, `SessionStart.*PreCompact`

**found:** none

**blueprint proposes:** inline array `['SessionStart', 'PreCompact', 'PostCompact']` for wildcard expansion

**why it holds:** this is new, but:
1. it's inline (not a named constant)
2. it's used in exactly one place (wildcard branch)
3. criteria usecase.5 explicitly requires wildcard expansion
4. the three values are the complete set of claude code boot events

a named `BOOT_EVENTS` constant would be premature abstraction for single-use. the inline array is the minimal solution.

---

### mechanism 3: return type change

**searched for:** `translateHookToClaudeCode` callers

**found:**
- `genBrainHooksAdapterForClaudeCode.upsert:109` — destructures single return
- `genBrainHooksAdapterForClaudeCode.del:164` — uses event from hook directly

**blueprint proposes:** return `Array<{ event, entry }>` instead of single object

**why it holds:** this is not a new mechanism. it's a signature change to an extant function. the change is required because:
1. wildcard can emit 3 entries (one per boot event)
2. array return enables this without new functions
3. all callers are updated in the blueprint (upsert iterates, del checks filter.what)

---

### mechanism 4: del bucket lookup

**searched for:** `del` method, `claudeEvent`, bucket lookup

**found:** del uses `eventMap[event]` to find bucket, ignores filter.what

**blueprint proposes:** for onBoot + filter.what, use filter.what as bucket key

**why it holds:** this extends extant bucket lookup logic, not creates new mechanism. the fix ensures del finds hooks in the correct bucket (PostCompact vs SessionStart).

---

## duplicate mechanism analysis

### duplicate EVENT_MAP in del

**location:** `genBrainHooksAdapterForClaudeCode.ts:159-163`

```ts
const eventMap: Record<BrainHookEvent, string> = {
  onBoot: 'SessionStart',
  onTool: 'PreToolUse',
  onStop: 'Stop',
};
```

**question:** should the blueprint extract this to shared constant?

**answer:** no. r3 YAGNI review already addressed this:
> "to extract it to shared constant would be 'while we're here' DRY — not requested, not necessary for correctness. the blueprint keeps it inline."

the duplicate existed before this wish. to refactor would be scope creep. the blueprint correctly leaves it as-is and adds filter.what lookup for onBoot events inline.

---

## why this holds

### no new abstractions

| proposed change | type | justification |
|-----------------|------|---------------|
| filter.what conditional | logic extension | adds branch to extant EVENT_MAP usage |
| inline boot events array | inline value | single-use, not reusable abstraction |
| array return type | signature change | enables wildcard without new function |
| del bucket lookup | logic extension | fixes bug in extant lookup |

all changes extend extant code. no new utility functions, no new classes, no new patterns.

### consistency with extant patterns

the codebase uses inline conditional logic for special cases. examples:
- `onTool` has special `filter.when` logic for before/after
- `del` has inline eventMap (not imported)

the blueprint follows this pattern: inline logic for special cases, not extracted utilities.

### alternatives considered

1. **extract shared EVENT_MAP** — rejected per YAGNI (not requested)
2. **create BOOT_EVENTS constant** — rejected (single-use)
3. **new function for wildcard expansion** — rejected (inline array sufficient)
4. **refactor del to use translateHookToClaudeCode** — rejected (different purposes: translate vs lookup)

---

## lessons

### lesson 1: search before you add

before a new mechanism is proposed:
1. search the codebase for extant similar mechanisms
2. check if extant mechanism can be extended
3. only add new if extant cannot serve

the blueprint followed this: found EVENT_MAP, extended it rather than create new.

### lesson 2: inline is acceptable for single-use

the `['SessionStart', 'PreCompact', 'PostCompact']` array is new but acceptable because:
- used in one place only
- explicit requirement (wildcard)
- complete set (all boot events)

named constants serve reuse. inline values serve clarity in single-use contexts.

### lesson 3: signature changes are extensions, not new mechanisms

a return type change from `T` to `T[]` is not a new mechanism. it's an extension of an extant mechanism to handle new cases. the function identity stays the same; only its capabilities expand.

### lesson 4: duplicates stay duplicates unless refactor requested

the wish did not ask for refactor. the duplicate EVENT_MAP existed before. to refactor would be scope creep. the blueprint correctly:
1. acknowledges the duplicate exists
2. notes it in the codepath tree
3. does not attempt to "fix" it

---

## final verdict

| question | answer |
|----------|--------|
| new mechanisms? | 1 inline array (justified by usecase.5) |
| new abstractions? | 0 |
| duplicated extant mechanisms? | 0 (duplicate existed before) |
| extended extant mechanisms? | 3 (EVENT_MAP logic, return type, del lookup) |

**verdict: CONSISTENT** — the blueprint extends extant mechanisms with minimal new code. no premature abstractions. no scope creep.
