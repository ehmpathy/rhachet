# review: has-consistent-mechanisms

## verdict: all mechanisms follow extant patterns — no duplication

every change mirrors the extant pattern for onBoot/onTool/onStop. no new mechanisms were introduced.

## evidence

### 1. extraction loop (syncOneRoleHooksIntoOneBrainRepl.ts)

extant pattern:
```typescript
for (const h of onBrain.onBoot ?? []) {
  declared.push(new BrainHook({ author, event: 'onBoot', command: h.command, timeout: h.timeout }));
}
```

added pattern:
```typescript
for (const h of onBrain.onTalk ?? []) {
  declared.push(new BrainHook({ author, event: 'onTalk', command: h.command, timeout: h.timeout }));
}
```

identical structure. no new mechanism.

### 2. EVENT_MAP (translateHook.ts)

extant pattern:
```typescript
const EVENT_MAP = {
  onBoot: 'SessionStart',
  onTool: 'PreToolUse',
  onStop: 'Stop',
};
```

added:
```typescript
onTalk: 'UserPromptSubmit',
```

object literal expansion. no new mechanism.

### 3. opencode getHookImplementation (config.dao.ts)

extant pattern:
```typescript
if (event === 'onBoot') { return `session: { created: ... }`; }
if (event === 'onTool') { return `tool: { execute: { before: ... } }`; }
if (event === 'onStop') { return `session: { idle: ... }`; }
```

added:
```typescript
if (event === 'onTalk') { return `chat: { message: ... }`; }
```

identical if-chain structure. no new mechanism.

### 4. del event map (genBrainHooksAdapterForClaudeCode.ts)

extant pattern:
```typescript
const claudeEvents = {
  onBoot: ['SessionStart', 'PreCompact', 'PostCompact'],
  onTool: ['PreToolUse'],
  onStop: ['Stop'],
};
```

added:
```typescript
onTalk: ['UserPromptSubmit'],
```

object literal expansion. no new mechanism.

### 5. regex (opencode config.dao.ts)

extant pattern:
```typescript
/^rhachet-(.+)-(onBoot|onTool|onStop)-[a-zA-Z0-9_-]+\.ts$/
```

modified:
```typescript
/^rhachet-(.+)-(onBoot|onTool|onStop|onTalk)-[a-zA-Z0-9_-]+\.ts$/
```

regex alternation expansion. no new mechanism.

## conclusion

all changes follow extant patterns exactly. no new mechanisms, no duplication.
