# review: has-ergonomics-validated (r9)

## verdict: complete — ergonomics match planned criteria

the implementation matches the planned input/output shapes from the blackbox criteria.

---

## verification process

I read through each artifact line by line:

1. **2.1.criteria.blackbox.md** (from session context) — the planned input/output shapes
2. **RoleHooksOnBrain.ts** (lines 9-14, 20-25) — the interface that accepts onTalk
3. **RoleHookOnBrain.ts** (lines 12-16) — the shape of each hook
4. **translateHook.ts** (lines 23-28, 34-77) — how onTalk becomes UserPromptSubmit

---

## planned vs actual comparison

### input shape

**planned (from 2.1.criteria.blackbox.md):**

```typescript
hooks: {
  onBrain: {
    onTalk: [{
      command: string;       // path to executable
      timeout: IsoDuration;  // e.g., 'PT5S'
    }];
  };
}
```

**actual (from RoleHookOnBrain.ts lines 12-16 + RoleHooksOnBrain.ts lines 9-14):**

```typescript
// RoleHooksOnBrain interface (lines 9-14)
export interface RoleHooksOnBrain {
  onBoot?: RoleHookOnBrain[];
  onTool?: RoleHookOnBrain[];
  onStop?: RoleHookOnBrain[];
  onTalk?: RoleHookOnBrain[];  // added
}

// RoleHookOnBrain interface (lines 12-16)
export interface RoleHookOnBrain {
  command: string;
  timeout: IsoDuration;
  filter?: BrainHookFilter;  // optional, not in criteria but harmless
}

// static nested declaration (lines 20-25)
public static nested = {
  onBoot: RoleHookOnBrain,
  onTool: RoleHookOnBrain,
  onStop: RoleHookOnBrain,
  onTalk: RoleHookOnBrain,  // added
};
```

| field | planned | actual | match? |
|-------|---------|--------|--------|
| command | `string` | `string` | yes |
| timeout | `IsoDuration` | `IsoDuration` | yes |
| filter | not specified | `BrainHookFilter \| undefined` | yes (optional, not required) |

**ergonomics check:** input shape matches. the optional `filter` field is additive and does not affect the developer experience for onTalk. the vision explicitly states "filter.what is not supported for UserPromptSubmit" — this optional field is harmless for onTalk.

### output shape

**planned (from 2.1.criteria.blackbox.md):**

```json
{
  "hooks": {
    "UserPromptSubmit": [{
      "matcher": "*",
      "hooks": [{
        "type": "command",
        "command": "<declared command>",
        "timeout": <timeout in ms>
      }]
    }]
  }
}
```

**actual (from translateHook.ts lines 23-28 and 74-76):**

```typescript
// EVENT_MAP (lines 23-28)
const EVENT_MAP: Record<BrainHookEvent, string> = {
  onBoot: 'SessionStart',
  onTool: 'PreToolUse',
  onStop: 'Stop',
  onTalk: 'UserPromptSubmit',  // maps correctly
};

// default path for onTool, onStop, onTalk (lines 74-76)
const matcher = hook.filter?.what ?? '*';
return { event: EVENT_MAP[hook.event], entry: buildEntry(matcher) };

// buildEntry helper (lines 43-52)
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

**code path trace for onTalk:**

1. onTalk hook enters `translateHookToClaudeCode`
2. onBoot check at line 55 fails (event is 'onTalk', not 'onBoot')
3. falls through to lines 74-76
4. `matcher = hook.filter?.what ?? '*'` → '*' (onTalk has no filter.what)
5. `EVENT_MAP['onTalk']` → 'UserPromptSubmit'
6. `buildEntry('*')` → `{ matcher: '*', hooks: [{ type: 'command', ... }] }`
7. returns `{ event: 'UserPromptSubmit', entry: { matcher: '*', ... } }`

| field | planned | actual | match? |
|-------|---------|--------|--------|
| event bucket | `UserPromptSubmit` | `UserPromptSubmit` (via EVENT_MAP) | yes |
| matcher | `"*"` | `"*"` (from `hook.filter?.what ?? '*'`) | yes |
| type | `"command"` | `"command"` (hardcoded in buildEntry) | yes |
| command | declared command | `hook.command` (passed through) | yes |
| timeout | ms from IsoDuration | `toMilliseconds(hook.timeout)` | yes |

**ergonomics check:** output shape matches the planned criteria exactly.

---

## developer experience validation

### symmetry with extant hooks

| hook | declaration | output event | code path |
|------|-------------|--------------|-----------|
| onBoot | `onBrain.onBoot` | SessionStart | special case (lines 55-72) |
| onTool | `onBrain.onTool` | PreToolUse | default path (lines 74-76) |
| onStop | `onBrain.onStop` | Stop | default path (lines 74-76) |
| onTalk | `onBrain.onTalk` | UserPromptSubmit | default path (lines 74-76) |

onTalk follows the exact same code path as onTool and onStop. this is intentional — onBoot has special semantics for filter.what (PreCompact, PostCompact), while onTalk/onTool/onStop use the simpler default path.

developers familiar with onTool/onStop will find onTalk identical in behavior.

### discoverability

the `RoleHooksOnBrain` interface (lines 9-14) exposes all four hook types at the same level:

```typescript
export interface RoleHooksOnBrain {
  onBoot?: RoleHookOnBrain[];
  onTool?: RoleHookOnBrain[];
  onStop?: RoleHookOnBrain[];
  onTalk?: RoleHookOnBrain[];  // visible alongside others
}
```

TypeScript autocomplete shows onTalk alongside onBoot/onTool/onStop.

### error flow

invalid timeout or command errors flow through the extant error paths — no special cases for onTalk. the `toMilliseconds` call at line 40 validates the timeout format uniformly.

### reverse translation

the `translateHookFromClaudeCode` function (lines 102-106) correctly maps UserPromptSubmit back to onTalk:

```typescript
const rhachetEvent = Object.entries(EVENT_MAP).find(
  ([, v]) => v === event,
)?.[0] as BrainHookEvent | undefined;
```

this reverse lookup finds `onTalk` when event is `UserPromptSubmit`.

---

## reflection: did the design drift?

paused to consider: did the ergonomics change between planning (criteria.blackbox) and implementation?

| aspect | planned | implemented | drift? |
|--------|---------|-------------|--------|
| onTalk position | alongside onBoot/onTool/onStop | lines 13, 24 — alongside others | no |
| shape | `{ command, timeout }` | `{ command, timeout, filter? }` | no — filter is optional |
| output event | UserPromptSubmit | EVENT_MAP['onTalk'] = 'UserPromptSubmit' | no |
| matcher | `"*"` | defaults to `"*"` via `filter?.what ?? '*'` | no |

**conclusion:** no drift. the implementation matches the planned ergonomics.

---

## what I found (non-issue)

**non-issue:** ergonomics are validated.

**why it holds:**

| check | result | evidence |
|-------|--------|----------|
| input shape matches criteria | yes | RoleHookOnBrain lines 12-16 |
| output shape matches criteria | yes | translateHook lines 74-76 + buildEntry |
| symmetric with extant hooks | yes | same code path as onTool/onStop |
| discoverable via autocomplete | yes | RoleHooksOnBrain interface lines 9-14 |
| reverse translation works | yes | EVENT_MAP reverse lookup lines 102-106 |
| no design drift | yes | compared planned vs implemented above |

---

## conclusion

this review passes because:
- input shape matches planned criteria exactly (command, timeout as required; filter as optional)
- output shape matches planned criteria exactly (UserPromptSubmit event, `"*"` matcher)
- onTalk uses the same code path as onTool/onStop (lines 74-76)
- TypeScript autocomplete surfaces onTalk alongside other hooks
- reverse translation from UserPromptSubmit → onTalk works correctly
- no ergonomic drift occurred between planning and implementation

