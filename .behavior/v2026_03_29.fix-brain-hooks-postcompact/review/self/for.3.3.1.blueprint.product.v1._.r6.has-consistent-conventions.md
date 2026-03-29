# self-review r6: has-consistent-conventions

## deep convention analysis

### convention 1: Pre/Post prefix pattern

**searched for:** Pre* and Post* in claude code events

**found:**
- `PreToolUse` — Pre prefix for "before" events
- `PostToolUse` — Post prefix for "after" events

**blueprint proposes:**
- `PreCompact` — Pre prefix for "before compaction"
- `PostCompact` — Post prefix for "after compaction"

**why it holds precisely:** the Pre/Post pattern in claude code means temporal relation to an action:
- Pre = before the action occurs
- Post = after the action completes

PreCompact and PostCompact follow this exactly. the action is "compaction". the prefix describes when the hook fires relative to that action.

**alternative considered:** could have used `BeforeCompact`/`AfterCompact`, but claude code uses Pre/Post, so we follow.

---

### convention 2: error type selection

**searched for:** error type usage patterns

**found:**
- `UnexpectedCodePathError` — internal logic errors, "should not happen"
- `BadRequestError` — user input validation failures

**blueprint proposes:** `UnexpectedCodePathError` for invalid filter.what

**why it holds precisely:** when filter.what is invalid:
- it's not user input (role author already wrote it)
- it's not a runtime condition (static configuration)
- it's a logic error in the role definition

the error message will help the role author fix their typo. `UnexpectedCodePathError` is correct because this path should not be reached with valid role definitions.

---

### convention 3: return type array vs object

**searched for:** patterns for single-to-multiple returns

**found:**
- most functions return single value
- functions that can return multiple items use arrays
- no wrapper objects like `{ items: [...] }`

**blueprint proposes:** change return from `{ event, entry }` to `Array<{ event, entry }>`

**why it holds precisely:** when wildcard fires, we need 3 events. the options were:
1. return array (simple, matches extant patterns)
2. return object with items (verbose, not in codebase)
3. return generator (complex, not needed)

array is the simplest and matches how the codebase handles multiplicity.

---

### convention 4: inline vs extracted constants

**searched for:** when constants are extracted vs inline

**found:**
- `EVENT_MAP` is extracted (used in multiple places)
- inline arrays appear for single-use lists

**blueprint proposes:** inline `['SessionStart', 'PreCompact', 'PostCompact']`

**why it holds precisely:** the boot events array is:
- used exactly once (wildcard branch)
- not shared across files
- clear by inspection (the values are the complete set)

extraction would add indirection without benefit. inline is correct here.

---

### convention 5: type interface extension

**searched for:** how ClaudeCodeSettings is structured

**found:**
```ts
hooks?: {
  SessionStart?: ClaudeCodeHookEntry[];
  // ... each event is optional, array type
}
```

**blueprint proposes:** add `PreCompact?:` and `PostCompact?:` with same pattern

**why it holds precisely:** every event type in the interface follows:
1. optional (undefined if no hooks)
2. PascalCase key (matches claude code event name)
3. array of entry type

the new keys follow this exact pattern. no deviation.

---

## cross-reference validation

### blueprint lines checked

| blueprint line | element | convention | verdict |
|----------------|---------|------------|---------|
| 37 | filter.what = SessionStart/PreCompact/PostCompact | PascalCase events | correct |
| 40 | UnexpectedCodePathError | error type | correct |
| 54 | reverse map entries | event → filter.what | follows extant reverse pattern |
| 76-84 | ClaudeCodeSettings extension | interface pattern | matches extant keys |

---

## lessons

### lesson 1: conventions carry semantics

the Pre/Post prefix is not arbitrary style. it carries semantic weight:
- Pre = synchronous hook before action
- Post = synchronous hook after action

when you follow a convention, you inherit its semantics. PreCompact means "fires before compaction" because that's what Pre means in this codebase.

### lesson 2: error types are contracts

`UnexpectedCodePathError` tells the caller:
- this should not happen in production
- a flaw exists in configuration
- the error message will help diagnose

`BadRequestError` tells the caller:
- your input is invalid
- fix your request and retry

the blueprint correctly uses UnexpectedCodePathError because invalid filter.what is a configuration error, not a runtime input error.

### lesson 3: multiplicity patterns matter

when a function's return changes from single to multiple:
- array is the simplest pattern
- preserves element type
- callers iterate naturally

the codebase does not use wrapper objects like `{ results: [...] }`. the blueprint follows this: bare array return.

### lesson 4: extraction has a threshold

constants are extracted when:
- used in multiple places
- need to change in one place
- have semantic name value

the boot events array fails these criteria:
- used once
- values are claude code's event names (won't change from our side)
- inline values are clear by inspection

inline is correct. extraction would be premature.

---

## no issues found

| convention | checked | status |
|------------|---------|--------|
| Pre/Post prefix | yes | matches extant |
| error type | yes | correct for scenario |
| return type | yes | follows codebase pattern |
| constant extraction | yes | inline is appropriate |
| type interface | yes | matches extant keys |

---

## final verdict

**verdict: CONSISTENT** — all conventions followed. no divergence detected. each choice aligns with extant patterns for clear reasons.
