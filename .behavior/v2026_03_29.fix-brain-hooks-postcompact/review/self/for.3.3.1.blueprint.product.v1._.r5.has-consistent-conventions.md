# self-review r5: has-consistent-conventions

## search for extant conventions

### convention 1: error type for invalid input

**searched for:** error types used in translateHook.ts and related files

**found:**
- `translateHook.ts` uses `UnexpectedCodePathError` for invalid state
- codebase pattern: `UnexpectedCodePathError` for internal logic errors, `BadRequestError` for user input errors

**blueprint proposes:** `UnexpectedCodePathError` for invalid filter.what value

**why it holds:** filter.what validation is an internal logic error (role definition typo), not a user input error from an API boundary. the blueprint uses the correct error type.

---

### convention 2: constant name pattern

**searched for:** constant name patterns in hooks/ directory

**found:**
- `EVENT_MAP` — all caps, underscore separator
- `ClaudeCodeHookEntry` — PascalCase for types
- `translateHookToClaudeCode` — camelCase for functions

**blueprint proposes:**
- inline array `['SessionStart', 'PreCompact', 'PostCompact']` (no named constant)
- extends EVENT_MAP usage (no rename)

**why it holds:** blueprint does not introduce new constants. inline array avoids the question of name convention.

---

### convention 3: function name pattern

**searched for:** function names in hooks/ directory

**found:**
- `translateHookToClaudeCode` — verb + target + context
- `translateHookFromClaudeCode` — verb + target + context (reverse)
- `genBrainHooksAdapterForClaudeCode` — gen + domain + context

**blueprint proposes:** no new functions; extends extant functions

**why it holds:** no name convention questions arise because no new functions are added.

---

### convention 4: event name pattern

**searched for:** claude code event names

**found:**
- `SessionStart` — PascalCase
- `PreToolUse` — PascalCase
- `PostToolUse` — PascalCase
- `Stop` — PascalCase

**blueprint proposes:**
- `PreCompact` — PascalCase
- `PostCompact` — PascalCase

**why it holds:** new event names follow extant PascalCase convention. Pre/Post prefix matches PreToolUse/PostToolUse pattern.

---

### convention 5: filter.what value pattern

**searched for:** filter.what usage in codebase

**found:**
- onTool: filter.what = tool name (e.g., `Bash`, `Write`, `*`)
- values are PascalCase or `*` (wildcard)

**blueprint proposes:**
- filter.what for onBoot: `SessionStart`, `PreCompact`, `PostCompact`, `*`
- all PascalCase or wildcard

**why it holds:** values follow extant pattern (PascalCase for specific, `*` for wildcard).

---

### convention 6: type extension pattern

**searched for:** how types are extended in config.dao.ts

**found:**
```ts
export interface ClaudeCodeSettings {
  hooks?: {
    SessionStart?: ClaudeCodeHookEntry[];
    PreToolUse?: ClaudeCodeHookEntry[];
    PostToolUse?: ClaudeCodeHookEntry[];
    Stop?: ClaudeCodeHookEntry[];
  };
}
```

**blueprint proposes:**
```ts
PreCompact?: ClaudeCodeHookEntry[];
PostCompact?: ClaudeCodeHookEntry[];
```

**why it holds:** new keys follow extant pattern exactly:
- optional (`?`)
- PascalCase key name
- array of `ClaudeCodeHookEntry`

---

### convention 7: test file name pattern

**searched for:** test file names in hooks/ directory

**found:** `translateHook.test.ts` (collocated with source)

**blueprint proposes:** extend `translateHook.test.ts` (no new file)

**why it holds:** tests are added to extant file, no name question.

---

### convention 8: supplier brief name pattern

**searched for:** brief names in `.agent/repo=.this/role=user/briefs/brains/`

**found:** no extant briefs in this directory (to be created)

**blueprint proposes:** `howto.use.brain.hooks.md`

**why it holds:** follows codebase brief convention:
- `howto.` prefix for how-to guides
- lowercase with dots
- descriptive topic

---

## divergence check

| element | extant convention | blueprint follows? |
|---------|-------------------|-------------------|
| error type | UnexpectedCodePathError for logic errors | yes |
| constant names | ALL_CAPS_UNDERSCORE | n/a (no new constants) |
| function names | camelCase verb+target | n/a (no new functions) |
| event names | PascalCase | yes (PreCompact, PostCompact) |
| filter.what values | PascalCase or `*` | yes |
| type keys | PascalCase, optional, array | yes |
| test files | collocated .test.ts | yes |
| brief names | howto.topic.md | yes |

**verdict: NO DIVERGENCE** — all blueprint choices follow extant conventions.

---

## lessons

### lesson 1: search before you name

before you choose a name, search the codebase for:
1. extant names in the same domain
2. patterns (prefix, suffix, case style)
3. similar concepts with established names

the blueprint did this: found PreToolUse/PostToolUse, used PreCompact/PostCompact.

### lesson 2: no new names means no convention risk

the blueprint extends extant functions rather than add new ones. this eliminates the risk of name convention divergence. extension is safer than creation.

### lesson 3: PascalCase for events is established

claude code uses PascalCase for all event names:
- SessionStart, Stop (single word)
- PreToolUse, PostToolUse (compound)

PreCompact and PostCompact follow this pattern exactly.

### lesson 4: brief name conventions come from role

the `howto.` prefix is a convention from the mechanic role briefs. the blueprint follows it because the supplier brief serves the same purpose: teach how to use a feature.

---

## final verdict

| question | answer |
|----------|--------|
| diverge from name conventions? | no |
| introduce new terms when extant terms exist? | no |
| structure match extant patterns? | yes |
| any convention issues flagged? | none |

**verdict: CONSISTENT** — blueprint follows all extant conventions. no divergence detected.
