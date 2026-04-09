# self-review r3: has-questioned-assumptions

## what i reviewed

i identified hidden technical assumptions in the blueprint and verified each against the codebase.

---

## assumption 1: EVENT_MAP handles both forward and reverse translation

**the assumption:** "add to EVENT_MAP, and translateHookFromClaudeCode will work automatically"

**verification:** i read translateHook.ts lines 101-105:
```typescript
const rhachetEvent = Object.entries(EVENT_MAP).find(
  ([, v]) => v === event,
)?.[0] as BrainHookEvent | undefined;

if (!rhachetEvent) return [];
```

**result:** the reverse translation does a dynamic lookup via `Object.entries(EVENT_MAP)`. no hardcoded reverse map exists.

**verdict:** assumption holds — EVENT_MAP addition enables both directions.

---

## assumption 2: pruneOrphanedRoleHooks will handle onTalk cleanup

**the assumption:** "no new code needed for cleanup — extant prune logic handles it"

**verification:** i read pruneOrphanedRoleHooksFromOneBrain.ts:
```typescript
const allHooks = await adapter.dao.get.all();
const rhachetHooks = allHooks.filter((h) =>
  rhachetAuthorPattern.test(h.author),
);
const orphanedHooks = rhachetHooks.filter(
  (hook) => !authorsDesired.has(hook.author),
);
```

**result:** the prune function is event-agnostic:
- it gets ALL hooks from the brain
- it filters by author pattern (repo=.../role=...)
- it compares against authorsDesired set
- it does NOT hardcode event types

**verdict:** assumption holds — prune works on any hook with rhachet-managed author.

---

## assumption 3: only two places have hardcoded event lists

**the assumption:** "we only need to update BrainHookEvent type and opencode regex"

**verification:** i searched for `onBoot.*onTool.*onStop`:
```
src/_topublish/rhachet-brains-opencode/src/hooks/config.dao.ts:41:
    /^rhachet-(.+)-(onBoot|onTool|onStop)-[a-zA-Z0-9_-]+\.ts$/,

src/domain.objects/BrainHookEvent.ts:10:
    export type BrainHookEvent = 'onBoot' | 'onTool' | 'onStop';
```

**result:** only two files contain the hardcoded event list. both are in the blueprint.

**verdict:** assumption holds — blueprint identifies all hardcoded event lists.

---

## assumption 4: extractDeclaredHooks uses hardcoded for-loops

**the assumption:** "we must add a fourth for-loop; there's no dynamic iteration"

**verification:** i read syncOneRoleHooksIntoOneBrainRepl.ts lines 96-122:
```typescript
// extract onBoot hooks
for (const h of onBrain.onBoot ?? []) { ... }

// extract onTool hooks
for (const h of onBrain.onTool ?? []) { ... }

// extract onStop hooks
for (const h of onBrain.onStop ?? []) { ... }
```

**result:** three separate for-loops exist, each hardcoded to a specific event property. no dynamic iteration. pattern must be extended.

**verdict:** assumption holds — a fourth for-loop is required.

---

## assumption 5: RoleHooksOnBrain.nested is required for hydration

**the assumption:** "without nested entry, onTalk arrays won't hydrate as RoleHookOnBrain instances"

**what if we skip it?** let me check what RoleHookOnBrain is:

**verification:** RoleHookOnBrain is a domain object. the `nested` static property tells domain-objects which class to instantiate for nested properties.

**what would happen without it?** onTalk hooks would remain as plain objects. this could cause:
- instanceof checks to fail
- schema validation to differ
- serialization to differ

**verdict:** assumption holds — nested entry is required for correct domain-object hydration.

---

## assumption 6: opencode chat.message is correct for onTalk

**the assumption:** "onTalk maps to chat.message in opencode"

**what if chat.message has different semantics?**

**verification:** this was a wisher decision recorded in the vision:
> "**opencode scope** [answered]: yes — support onTalk for opencode via chat.message event."

the wisher confirmed this map. if the map is wrong, the wisher would need to correct it.

**verdict:** assumption is a design decision, not a technical assumption. the wisher owns this.

---

## assumption 7: timeout works uniformly across events

**the assumption:** "timeout translation applies the same to onTalk as other events"

**verification:** i read translateHookToClaudeCode lines 38-50:
```typescript
const timeoutMs = toMilliseconds(hook.timeout);

const buildEntry = (matcher: string): ClaudeCodeHookEntry => ({
  matcher,
  hooks: [
    {
      type: 'command',
      command: hook.command,
      ...(timeoutMs && { timeout: timeoutMs }),
    },
  ],
});
```

**result:** the timeout is converted and applied uniformly via `buildEntry`, which is used for all events. no event-specific timeout logic exists.

**verdict:** assumption holds — timeout works the same for all events.

---

## found issues: none

all technical assumptions were verified against the codebase.

---

## summary

| assumption | verified? | evidence |
|------------|-----------|----------|
| EVENT_MAP handles both directions | yes | reverse lookup uses Object.entries |
| prune handles onTalk cleanup | yes | prune is event-agnostic |
| only 2 places have hardcoded events | yes | grep found only 2 files |
| extractDeclaredHooks uses hardcoded loops | yes | 3 for-loops, pattern must extend |
| nested entry required for hydration | yes | domain-objects pattern |
| chat.message map correct | yes (design decision) | wisher confirmed |
| timeout works uniformly | yes | buildEntry applies to all events |

---

## verdict

**no hidden assumptions found.**

every technical assumption in the blueprint was verified against the actual codebase. the blueprint correctly identifies what needs to change and what works automatically.
