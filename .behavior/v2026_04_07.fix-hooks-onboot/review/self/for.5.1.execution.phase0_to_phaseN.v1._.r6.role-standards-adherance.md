# review: role-standards-adherance (r6)

## verdict: adherent — all changes follow mechanic standards

reviewed changed code against mechanic role briefs. implementation mirrors prior patterns exactly.

---

## rule directories checked

| directory | scope |
|-----------|-------|
| `lang.terms/` | term conventions, gerunds, treestruct |
| `lang.tones/` | lowercase, no buzzwords |
| `code.prod/evolvable.procedures/` | arrow-only, input-context, headers |
| `code.prod/evolvable.domain.objects/` | domain-driven-design |
| `code.prod/readable.narrative/` | narrative flow, no else |
| `code.test/frames.behavior/` | given-when-then |

---

## file-by-file analysis

### BrainHookEvent.ts

| standard | status | evidence |
|----------|--------|----------|
| .what/.why header | ✓ | lines 1-9 have header |
| no gerunds | ✓ | no gerunds in comment |
| lowercase comments | ✓ | lowercase used |

```typescript
// lines 1-9: header present
/**
 * .what = event types that trigger brain hooks
 * .why = defines the lifecycle moments where hooks can execute
 */
```

---

### RoleHooksOnBrain.ts

| standard | status | evidence |
|----------|--------|----------|
| domain object | ✓ | extends DomainLiteral |
| .what/.why header | ✓ | lines 5-8 |
| static nested | ✓ | line 24 includes onTalk |

```typescript
// line 24: onTalk in nested matches pattern
onTalk: RoleHookOnBrain,
```

---

### syncOneRoleHooksIntoOneBrainRepl.ts

| standard | status | evidence |
|----------|--------|----------|
| .what/.why header | ✓ | lines 8-14, 81-83 |
| arrow functions | ✓ | all functions use arrows |
| input-context pattern | ✓ | lines 16-26, 85-88 |
| code paragraphs | ✓ | comments before each block |

new onTalk extraction block (lines 134-145):
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

mirrors prior onBoot/onTool/onStop blocks exactly — no structural deviation.

---

### translateHook.ts

| standard | status | evidence |
|----------|--------|----------|
| .what/.why header | ✓ | lines 9-11, 19-21, 30-32, 79-81 |
| arrow functions | ✓ | lines 34, 83 |
| input-context pattern | ✓ | lines 34-36, 83-87 |
| no else branches | ✓ | uses early returns |

new EVENT_MAP entry (line 27):
```typescript
onTalk: 'UserPromptSubmit',
```

follows prior pattern — one line, maps event to string.

---

### translateHook.test.ts

| standard | status | evidence |
|----------|--------|----------|
| given-when-then | ✓ | uses test-fns |
| case labels | ✓ | [case9], [case8] follow sequence |
| lowercase | ✓ | then descriptions lowercase |

new test cases:
- lines 177-204: `[case9] onTalk hook` for translateHookToClaudeCode
- lines 418-451: `[case8] UserPromptSubmit entry` for translateHookFromClaudeCode

both follow prior test structure exactly.

---

### config.dao.ts (opencode)

| standard | status | evidence |
|----------|--------|----------|
| .what/.why header | ✓ | all functions have headers |
| arrow functions | ✓ | all use arrows |
| no else branches | ✓ | uses if-return pattern |

new onTalk support (lines 120-126):
```typescript
if (event === 'onTalk') {
  return `    chat: {
    message: async () => {
      execSync(${JSON.stringify(command)}, { stdio: "inherit", timeout: ${timeoutMs} });
    },
  },`;
}
```

uses if-return pattern, no else — mirrors prior onBoot/onTool/onStop blocks.

---

### config.dao.test.ts (opencode)

| standard | status | evidence |
|----------|--------|----------|
| given-when-then | ✓ | uses test-fns |
| case labels | ✓ | [case3], [case4] follow sequence |

new test cases:
- lines 74-86: `[case3] valid onTalk filename`
- lines 154-180: `[case4] onTalk hook`

---

## issues found

none. all changes are purely additive and mirror prior patterns.

---

## why it holds

the implementation is copy-paste of prior patterns with `onTalk` substituted for event name. no new abstractions, no structural changes, no deviations from mechanic standards.

| change | follows pattern from |
|--------|---------------------|
| BrainHookEvent union | onBoot/onTool/onStop |
| RoleHooksOnBrain property | onBoot/onTool/onStop |
| extraction block | onBoot/onTool/onStop |
| EVENT_MAP entry | onBoot/onTool/onStop |
| if-return block | onBoot/onTool/onStop |
| test case | [case1]-[case8] |

mechanic standards preserved via pattern replication.
