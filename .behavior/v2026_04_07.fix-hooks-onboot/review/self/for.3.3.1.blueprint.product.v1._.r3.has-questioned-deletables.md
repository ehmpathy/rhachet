# self-review r3: has-questioned-deletables

## what i reviewed

i re-examined the blueprint with harder questions:

1. did the wisher request opencode support, or did we assume it?
2. can we merge any components to reduce touch points?
3. is there a simpler architecture that achieves the same outcome?
4. did we optimize components that shouldn't exist?

---

## hard question 1: did wisher request opencode support?

**the wish said:** "rhachet's Role.build() needs to support onTalk hook that maps to Claude's UserPromptSubmit event."

the wish only mentions claude code. opencode is not in the wish.

**the vision said:** under "wisher decisions [all resolved]", point 3:
> "**opencode scope** [answered]: yes — support onTalk for opencode via chat.message event."

**verdict:** the vision explicitly records that opencode scope was a wisher decision that was answered "yes". this was not an assumption — it was a deliberate scope confirmation. if the wisher had said "no", we would not include opencode changes.

**could we delete it?** only if we re-ask the wisher. the vision records their answer as "yes".

---

## hard question 2: can we merge components?

### translateHook.ts changes

the blueprint shows two changes:
1. EVENT_MAP — add `onTalk: 'UserPromptSubmit'`
2. translateHookFromClaudeCode — handle reverse lookup

**could we merge these?** no. they serve different purposes:
- EVENT_MAP is the forward translation (rhachet → claude code)
- translateHookFromClaudeCode uses reverse logic to find rhachet event from claude code event

they exist in the same file but are separate functions. to merge would entangle concerns.

### domain.objects changes

the blueprint shows two changes:
1. BrainHookEvent type — add `'onTalk'`
2. RoleHooksOnBrain — add `onTalk` property + nested

**could we merge these?** no. they are separate domain objects:
- BrainHookEvent is the event type union used across the codebase
- RoleHooksOnBrain is the interface for Role.build input

they must be separate because other code imports BrainHookEvent without RoleHooksOnBrain.

---

## hard question 3: is there a simpler architecture?

the extant codebase uses hardcoded event extraction:

```typescript
for (const h of onBrain.onBoot ?? []) { ... }
for (const h of onBrain.onTool ?? []) { ... }
for (const h of onBrain.onStop ?? []) { ... }
```

**could we use dynamic iteration instead?** yes, in theory we could refactor to:

```typescript
for (const event of ['onBoot', 'onTool', 'onStop', 'onTalk']) {
  for (const h of onBrain[event] ?? []) { ... }
}
```

**but:** this refactor is out of scope. the wish asks to add onTalk, not to refactor the hook system. the simpler path is to extend the extant pattern.

**verdict:** we follow the extant pattern. to refactor would be scope creep.

---

## hard question 4: did we optimize components that shouldn't exist?

### translateHookFromClaudeCode — do we need reverse translation?

**when does reverse translation happen?**

the sync operation:
1. reads extant hooks from settings.json
2. compares to declared hooks
3. upserts declared hooks
4. deletes orphan hooks

step 1 requires reverse translation to understand what's in settings.json.

**could we skip reverse translation?** only if we delete hooks without checking what they are. but then we'd delete hooks from other sources (manual, other tools). reverse translation lets us identify which hooks belong to rhachet.

**verdict:** reverse translation is not premature optimization — it's required for correct sync.

### RoleHooksOnBrain.nested — do we need the nested map entry?

**what happens if we skip it?**

the domain-objects library uses `nested` for automatic hydration. without `onTalk: RoleHookOnBrain`, the onTalk array would come through as plain objects.

**does this break functionality?** it could:
- instanceof checks would fail
- method calls would fail (if RoleHookOnBrain has methods)
- serialization might differ

**verdict:** the nested entry is not premature optimization — it's required for correct hydration.

---

## found issues: none

every component traces to a requirement and has a technical reason for existence.

---

## why it holds

| component | why it cannot be deleted | why it cannot be simplified |
|-----------|--------------------------|----------------------------|
| BrainHookEvent | foundation type for all event work | single line change, already minimal |
| RoleHooksOnBrain.onTalk | interface for Role.build | mirrors extant pattern |
| RoleHooksOnBrain.nested | domain-objects hydration | single line change |
| extractDeclaredHooks | hook extraction for sync | extant uses hardcoded loops |
| EVENT_MAP | forward translation | single line in extant map |
| translateHookFromClaudeCode | reverse translation for sync read | uses extant reverse lookup logic |
| ClaudeCodeSettings | typescript schema | single property in extant interface |
| opencode parsePluginFileName | wisher-confirmed scope | single regex change |
| opencode getHookImplementation | wisher-confirmed scope | single if-branch in extant switch |

---

## verdict

**no deletable components.**

i questioned each component with harder questions:
- opencode scope was confirmed by wisher (not assumed)
- components cannot be merged without concern entanglement
- extant architecture uses hardcoded patterns (scope does not include refactor)
- no components were prematurely optimized — each serves a specific function

the blueprint is minimal: 7 files, all single-line or single-block changes, that follow extant patterns.
