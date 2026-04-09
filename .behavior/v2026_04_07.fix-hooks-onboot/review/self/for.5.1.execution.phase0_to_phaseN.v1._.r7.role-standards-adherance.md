# review: role-standards-adherance (r7)

## verdict: adherent — line-by-line verification confirms standards met

inspected every changed file against mechanic briefs. verified each standard at specific line numbers.

---

## rule directories checked

| directory | relevance |
|-----------|-----------|
| `lang.terms/rule.forbid.gerunds` | comments, identifiers |
| `lang.terms/rule.require.treestruct` | function/type names |
| `lang.tones/rule.prefer.lowercase` | comments |
| `code.prod/evolvable.procedures/rule.require.arrow-only` | function syntax |
| `code.prod/evolvable.procedures/rule.require.input-context-pattern` | function signatures |
| `code.prod/readable.comments/rule.require.what-why-headers` | jsdoc headers |
| `code.prod/readable.narrative/rule.forbid.else-branches` | control flow |
| `code.test/frames.behavior/rule.require.given-when-then` | test structure |

---

## BrainHookEvent.ts — line-by-line

### rule.require.what-why-headers

**lines 1-9:**
```typescript
/**
 * .what = event types that trigger brain hooks
 * .why = defines the lifecycle moments where hooks can execute
 *
 * .note = maps to brain-specific events:
 *   - onBoot → SessionStart (claudecode), session.created (opencode)
 *   - onTool → PreToolUse/PostToolUse (claudecode), tool.execute.before/after (opencode)
 *   - onStop → Stop (claudecode), session.idle (opencode)
 *   - onTalk → UserPromptSubmit (claudecode), chat.message (opencode)
 */
```

**adherent:** header has .what and .why, lowercase prose, no gerunds.

### rule.require.treestruct

**line 11:**
```typescript
export type BrainHookEvent = 'onBoot' | 'onTool' | 'onStop' | 'onTalk';
```

**adherent:** type name follows `[...noun]` pattern — `Brain` + `Hook` + `Event`.

---

## RoleHooksOnBrain.ts — line-by-line

### rule.require.what-why-headers

**lines 5-8:**
```typescript
/**
 * .what = container for hook declarations by event type
 * .why = separates hooks by lifecycle moment (boot, tool use, stop)
 */
```

**adherent:** header present with .what/.why.

### rule.require.domain-driven-design

**lines 16-26:**
```typescript
export class RoleHooksOnBrain
  extends DomainLiteral<RoleHooksOnBrain>
  implements RoleHooksOnBrain
{
  public static nested = {
    onBoot: RoleHookOnBrain,
    onTool: RoleHookOnBrain,
    onStop: RoleHookOnBrain,
    onTalk: RoleHookOnBrain,
  };
}
```

**adherent:** extends DomainLiteral, implements interface, declares static nested for hydration.

### new code: line 13, line 24

```typescript
// line 13 (interface)
onTalk?: RoleHookOnBrain[];

// line 24 (nested)
onTalk: RoleHookOnBrain,
```

**adherent:** mirrors onBoot/onTool/onStop pattern exactly. same type, same structure.

---

## syncOneRoleHooksIntoOneBrainRepl.ts — line-by-line

### rule.require.what-why-headers

**lines 8-15:**
```typescript
/**
 * .what = syncs one role's hook declarations into one brain repl config
 * .why = enables declarative management of brain hooks
 *
 * .note = computes author namespace from role.repo + role.slug
 * .note = syncs declared hooks via upsert
 * .note = removes hooks no longer declared (declarative removal)
 */
```

**adherent:** header present.

**lines 81-84:**
```typescript
/**
 * .what = extracts BrainHook instances from role declarations
 * .why = converts RoleHookOnBrain to BrainHook with author
 */
```

**adherent:** internal helper also has header.

### rule.require.arrow-only

**line 16:** `export const syncOneRoleHooksIntoOneBrainRepl = async (input: {`
**line 85:** `const extractDeclaredHooks = (input: {`
**line 154:** `const computeHookDiff = (input: {`

**adherent:** all functions use arrow syntax, no `function` keyword.

### rule.require.input-context-pattern

**lines 16-26:**
```typescript
export const syncOneRoleHooksIntoOneBrainRepl = async (input: {
  role: HasRepo<Role>;
  adapter: BrainHooksAdapter;
}): Promise<{
```

**adherent:** uses `(input: { ... })` pattern.

### new code: lines 134-145

```typescript
// extract onTalk hooks
for (const h of onBrain.onTalk ?? []) {
  hooks.push(
    new BrainHook({
      author,
      event: 'onTalk',
      command: h.command,
      timeout: h.timeout,
      filter: h.filter,
    }),
  );
}
```

**adherent:**
- comment prefix: "extract onTalk hooks" (lowercase, no gerund)
- code structure: identical to lines 95-106 (onBoot), 108-119 (onTool), 121-132 (onStop)
- no else branches, no new patterns introduced

---

## translateHook.ts — line-by-line

### rule.require.what-why-headers

**lines 9-12:**
```typescript
/**
 * .what = valid boot event names for claude code
 * .why = used to validate filter.what for onBoot hooks
 */
```

**lines 19-22:**
```typescript
/**
 * .what = maps rhachet BrainHookEvent to claude code hook event name
 * .why = claude code uses different event names than rhachet
 */
```

**adherent:** all blocks have headers.

### rule.require.arrow-only

**line 34:** `export const translateHookToClaudeCode = (input: {`
**line 83:** `export const translateHookFromClaudeCode = (input: {`

**adherent:** arrow functions.

### rule.forbid.else-branches

**lines 55-76:**
```typescript
if (hook.event === 'onBoot') {
  // ...
  return { event: bootTrigger, entry: buildEntry('*') };
}

// for onTool and onStop, use extant logic
const matcher = hook.filter?.what ?? '*';
return { event: EVENT_MAP[hook.event], entry: buildEntry(matcher) };
```

**adherent:** uses if-return pattern, no else blocks.

### new code: line 27

```typescript
onTalk: 'UserPromptSubmit',
```

**adherent:** one-line addition to EVENT_MAP, follows pattern of lines 24-26.

---

## translateHook.test.ts — line-by-line

### rule.require.given-when-then

**lines 177-204 (new case9):**
```typescript
given('[case9] onTalk hook', () => {
  const hook: BrainHook = { ... };

  when('[t0] translated', () => {
    const { event, entry } = translateHookToClaudeCode({ hook });

    then('event is UserPromptSubmit', () => {
      expect(event).toEqual('UserPromptSubmit');
    });
    // ... more then blocks
  });
});
```

**adherent:** uses test-fns given/when/then, case label follows sequence [case9].

**lines 418-451 (new case8):**
```typescript
given('[case8] UserPromptSubmit entry', () => {
  // ...
  when('[t0] translated', () => {
    // ...
    then('event is onTalk', () => {
      expect(result[0]?.event).toEqual('onTalk');
    });
  });
});
```

**adherent:** same pattern.

---

## config.dao.ts (opencode) — line-by-line

### rule.require.what-why-headers

**lines 5-7, 17-19, 34-36, 54-56, 83-85:**
all functions have .what/.why headers.

### rule.forbid.else-branches

**lines 90-130:**
```typescript
if (event === 'onBoot') {
  return `...`;
}

if (event === 'onTool') {
  return `...`;
}

if (event === 'onStop') {
  return `...`;
}

if (event === 'onTalk') {
  return `...`;
}

// fallback
return `// unknown event: ${event}`;
```

**adherent:** chain of if-return, no else blocks.

### new code: lines 41, 120-126

**line 41 (regex update):**
```typescript
/^rhachet-(.+)-(onBoot|onTool|onStop|onTalk)-[a-zA-Z0-9_-]+\.ts$/,
```

**adherent:** adds `onTalk` to alternation, follows pattern.

**lines 120-126:**
```typescript
if (event === 'onTalk') {
  return `    chat: {
    message: async () => {
      execSync(${JSON.stringify(command)}, { stdio: "inherit", timeout: ${timeoutMs} });
    },
  },`;
}
```

**adherent:** if-return block mirrors lines 90-118, no else.

---

## config.dao.test.ts (opencode) — line-by-line

### rule.require.given-when-then

**lines 74-86 (new case3):**
```typescript
given('[case3] valid onTalk filename', () => {
  when('[t0] parsed', () => {
    const result = parsePluginFileName(...);

    then('returns author and event', () => {
      expect(result?.event).toBe('onTalk');
    });
  });
});
```

**lines 154-180 (new case4):**
```typescript
given('[case4] onTalk hook', () => {
  when('[t0] generated', () => {
    const content = generatePluginContent({ ... });

    then('includes chat.message hook', () => {
      expect(content).toContain('chat:');
      expect(content).toContain('message:');
    });
  });
});
```

**adherent:** test-fns pattern, case labels follow sequence.

---

## issues found

none. every changed line follows mechanic standards.

---

## why it holds

implementation is purely additive. each change replicates prior patterns:

| location | new code | mirrors |
|----------|----------|---------|
| BrainHookEvent.ts:11 | `'onTalk'` | `'onBoot' \| 'onTool' \| 'onStop'` |
| RoleHooksOnBrain.ts:13 | `onTalk?: RoleHookOnBrain[]` | lines 10-12 |
| RoleHooksOnBrain.ts:24 | `onTalk: RoleHookOnBrain` | lines 21-23 |
| syncOneRoleHooksIntoOneBrainRepl.ts:134-145 | extraction block | lines 95-132 |
| translateHook.ts:27 | `onTalk: 'UserPromptSubmit'` | lines 24-26 |
| config.dao.ts:41 | regex alternation | prior `onBoot\|onTool\|onStop` |
| config.dao.ts:120-126 | if-return block | lines 90-118 |

no new abstractions, no structural changes, no deviations from mechanic standards.
