# self-review r4: has-questioned-assumptions

## what i reviewed

i traced all code paths that handle event types to verify the research captured every hardcoded list.

---

## FOUND ISSUE: del function has hardcoded event map

**file:** `src/_topublish/rhachet-brains-anthropic/src/hooks/genBrainHooksAdapterForClaudeCode.ts`

**the code (lines 166-171):**
```typescript
const claudeEvents: string[] =
  event === 'onBoot'
    ? ['SessionStart', 'PreCompact', 'PostCompact']
    : event === 'onTool'
      ? ['PreToolUse']
      : ['Stop'];
```

**the problem:**
- this is a HARDCODED map from rhachet events to claude code events
- it does NOT use EVENT_MAP from translateHook.ts
- it does NOT handle onTalk
- if someone tries to delete an onTalk hook, the code falls through to else and uses `['Stop']`
- this is WRONG — onTalk should map to `['UserPromptSubmit']`

**why the research did not capture it:**
- the research searched for EVENT_MAP usages
- the research searched for hardcoded event unions
- this code uses a ternary chain, not a type union or map
- it's in the adapter, not in translateHook.ts

**impact:**
- delete operations on onTalk hooks would fail silently
- the hook would remain in settings.json under UserPromptSubmit
- but the code would search in the Stop bucket
- unlink would not clean up onTalk hooks properly

---

## how to fix

**option 1: extend the ternary (minimal)**
```typescript
const claudeEvents: string[] =
  event === 'onBoot'
    ? ['SessionStart', 'PreCompact', 'PostCompact']
    : event === 'onTool'
      ? ['PreToolUse']
      : event === 'onTalk'
        ? ['UserPromptSubmit']
        : ['Stop'];
```

**option 2: use EVENT_MAP (cleaner)**
```typescript
import { EVENT_MAP } from './translateHook';
// ...
const claudeEvents: string[] =
  event === 'onBoot'
    ? ['SessionStart', 'PreCompact', 'PostCompact']
    : [EVENT_MAP[event]];
```

**recommendation:** option 1 for consistency with extant pattern. option 2 requires EVENT_MAP export.

---

## blueprint update required

**add to filediff tree:**
```
src/_topublish/rhachet-brains-anthropic/src/hooks/
├── [~] genBrainHooksAdapterForClaudeCode.ts  # add onTalk to del event map
```

**add to codepath tree:**
```
genBrainHooksAdapterForClaudeCode.ts
└── dao.del
    └── claudeEvents map
        ├── [○] onBoot → ['SessionStart', 'PreCompact', 'PostCompact']
        ├── [○] onTool → ['PreToolUse']
        ├── [○] onStop → ['Stop']
        └── [+] onTalk → ['UserPromptSubmit']
```

---

## other assumptions verified

after I found this issue, i re-checked all other assumptions:

| assumption | status | evidence |
|------------|--------|----------|
| EVENT_MAP handles both directions | holds | Object.entries reverse lookup at line 101-105 of translateHook.ts |
| prune is event-agnostic | holds | filters by author pattern, not event |
| ClaudeCodeSettings needs UserPromptSubmit | holds | schema has explicit properties |
| nested entry needed for hydration | holds | domain-objects pattern, see RoleHooksOnBrain.nested |
| timeout uniform | holds | buildEntry applies to all events at line 42-50 |

### deep verification of codepaths

**translateHook.ts codepath:**
- line 23-27: EVENT_MAP maps rhachet → claude code events. only 3 entries (onBoot, onTool, onStop). adding `onTalk: 'UserPromptSubmit'` is all that's needed.
- line 54-71: onBoot has special handling for filter.what (SessionStart, PreCompact, PostCompact). onTalk does not need this — single event.
- line 74-75: non-boot events use `EVENT_MAP[hook.event]` directly. onTalk will use this path.
- line 101-105: reverse lookup iterates `Object.entries(EVENT_MAP)` to find rhachet event from claude code event. adding to EVENT_MAP automatically enables reverse.
- line 114-116: matcher defaults to `'*'` for non-boot events. onTalk will get wildcard matcher (UserPromptSubmit ignores it anyway per vision).

**extractDeclaredHooks codepath:**
- lines 96-132: three parallel for-loops, structurally identical. each extracts: author, event name, command, timeout, filter.
- adding onTalk follows exact same pattern: `for (const h of onBrain.onTalk ?? [])` with event='onTalk'.

**opencode config.dao.ts codepath:**
- line 41: regex `onBoot|onTool|onStop` — needs `onBoot|onTool|onStop|onTalk` to parse filenames.
- line 86-122: getHookImplementation has if-chain for onBoot → session.created, onTool → tool.execute.before, onStop → session.idle. needs onTalk → chat.message.

### assumptions about filter.what for onTalk

**assumption:** onTalk does not need filter.what support (unlike onBoot which has sub-events).

**evidence:**
- vision states: "matcher field is silently ignored for UserPromptSubmit — hook fires on every prompt. use `*` wildcard."
- translateHook.ts line 74: defaults to `'*'` for non-boot events
- UserPromptSubmit is a single event with no sub-events (unlike SessionStart/PreCompact/PostCompact)

**verdict:** assumption holds. no special filter handling needed for onTalk.

---

## verdict

**FOUND ISSUE: blueprint lacks genBrainHooksAdapterForClaudeCode.ts del function update.**

the research and blueprint did not capture a hardcoded event map in the del function. this must be added before implementation proceeds, otherwise unlink will not clean up onTalk hooks.

---

## fix applied

updated `3.3.1.blueprint.product.v1.i1.md`:

1. **filediff tree** — added `genBrainHooksAdapterForClaudeCode.ts # add onTalk to del event map`

2. **codepath tree** — added claude code adapter section:
   ```
   genBrainHooksAdapterForClaudeCode.ts
   └── dao.del
       └── claudeEvents map
           ├── [○] onBoot → ['SessionStart', 'PreCompact', 'PostCompact']
           ├── [○] onTool → ['PreToolUse']
           ├── [○] onStop → ['Stop']
           └── [+] onTalk → ['UserPromptSubmit']
   ```

3. **implementation order** — added step 6: `genBrainHooksAdapterForClaudeCode.ts — add onTalk to del event map`

the blueprint now captures all hardcoded event maps. unlink will properly clean up onTalk hooks.
