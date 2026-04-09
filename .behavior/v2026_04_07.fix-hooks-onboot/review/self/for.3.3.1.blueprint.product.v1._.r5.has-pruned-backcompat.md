# self-review r5: has-pruned-backcompat

## what i reviewed

i searched the blueprint for backwards compatibility concerns and checked if each was explicitly requested or assumed "to be safe".

---

## backwards-compat concerns in blueprint

### concern 1: translateHookFromClaudeCode backwards compat

**what i found:** the extant code at line 108-109 has a backwards-compat comment:
```typescript
// for SessionStart (onBoot), no filter means backwards compat
```

**does this apply to onTalk?** no — this is specifically about SessionStart, which has sub-events (PreCompact, PostCompact). old hooks may not have filter.what, so the code handles that gracefully.

**UserPromptSubmit has no sub-events.** there's no backwards-compat concern for onTalk because:
- it's a new event type with no legacy data
- the achiever role's workaround used direct jq injection, not rhachet hooks
- no migration of old hooks is needed

**verdict:** no backwards-compat code needed for onTalk

---

### concern 2: optional interface properties

**what i found:** `onTalk?: RoleHookOnBrain[]` uses optional (`?`) syntax.

**is this backwards-compat?** no — this is the standard pattern for optional properties:
- `onBoot?: RoleHookOnBrain[]`
- `onTool?: RoleHookOnBrain[]`
- `onStop?: RoleHookOnBrain[]`

all event properties are optional because roles don't need to declare hooks for every event.

**verdict:** not a backwards-compat concern — standard pattern

---

### concern 3: additive type changes

**what i found:** BrainHookEvent changes from `'onBoot' | 'onTool' | 'onStop'` to `'onBoot' | 'onTool' | 'onStop' | 'onTalk'`

**is this backwards-compat?** no — union expansion is additive. extant code that uses 'onBoot', 'onTool', 'onStop' continues to work. no code needs to handle 'onTalk' unless it chooses to.

**verdict:** not a backwards-compat concern — additive change

---

### concern 4: test preservation

**what i found:** blueprint adds new test cases, does not modify old ones.

**is this backwards-compat?** no — we're not locked to old test behavior "to be safe". we add coverage for new code.

**verdict:** not a backwards-compat concern

---

## explicit backwards-compat requests from wisher

i searched the wish and vision for explicit backwards-compat requests:

**wish:** no mention of backwards compatibility
**vision:** no mention of backwards compatibility

the wisher did not request any backwards-compat behavior.

---

## could we be more aggressive?

**question:** should we remove the optional `?` from interface properties?

**answer:** no — the optional modifier is not backwards-compat, it's semantic correctness. roles don't need to declare every hook type.

**question:** should we fail on unknown event types?

**answer:** this is out of scope — we're not asked to change how unknown events are handled.

---

## verdict

**no backwards-compat concerns found in blueprint.**

the implementation is purely additive:
- new type union member
- new interface property (optional, like extant)
- new extraction loop (parallel to extant)
- new EVENT_MAP entry (forward and reverse)
- new if-branch for opencode
- new test cases

no code was added "to maintain backwards compatibility" that wasn't explicitly requested.
