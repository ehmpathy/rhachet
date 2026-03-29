# self-review: has-consistent-conventions (r4)

## question

do new names diverge from extant conventions?

## the review process

i searched for extant name conventions and traced each new name against them.

## search: constant names in translateHook.ts

the file has one extant constant:

```ts
// line 23
const EVENT_MAP: Record<BrainHookEvent, string> = {...};
```

this is SCREAMING_SNAKE case for module-level constants.

**new constant at line 13:**

```ts
const VALID_BOOT_EVENTS = ['SessionStart', 'PreCompact', 'PostCompact'] as const;
```

**why it holds:** follows same SCREAMING_SNAKE pattern as EVENT_MAP.

## search: local variable names

the codebase uses camelCase for local variables. example from genBrainHooksAdapterForClaudeCode.ts:

```ts
const eventHooks = [...];
const hookIndex = eventHooks.findIndex(...);
const taggedEntry = {...};
```

**new local variables:**

| variable | location | pattern |
|----------|----------|---------|
| `bootTrigger` | translateHook.ts:57 | camelCase |
| `claudeEvents` | genBrainHooksAdapterForClaudeCode.ts:169 | camelCase |
| `buildEntry` | translateHook.ts:44 | camelCase (local function) |
| `translations` | genBrainHooksAdapterForClaudeCode.ts:108 | camelCase (plural for array) |

**why it holds:** all follow extant camelCase pattern. no divergence.

## search: supplier brief names

searched `.agent/repo=.this/role=user/briefs/brains/` for extant briefs:

```
howto.for.suppliers.md
howto.use.brain.on.md
howto.use.brain.genContextBrain.md
howto.use.brain.plugs.md
howto.use.brain.schema.md
howto.use.brain.role.md
howto.use.brain.tools.md
howto.use.brain.prompt.md
```

**pattern found:** `howto.use.brain.{topic}.md` for brain supplier briefs.

**new brief:** `howto.use.brain.hooks.md`

**why it holds:** follows exact `howto.use.brain.{topic}.md` pattern. "hooks" is the topic, consistent with "tools", "schema", "prompt" as topics.

## search: claude-prefixed terms

the adapter uses "claude" prefix in several places:

```ts
// slug
slug: 'claude-code',

// function name
genBrainHooksAdapterForClaudeCode

// type
ClaudeCodeSettings, ClaudeCodeHookEntry
```

**new variable:** `claudeEvents` in del method

**why it holds:** follows extant claude-prefixed terms in this adapter module.

## found: one potential divergence

**term:** "bootTrigger"

searched for "trigger" usage in the codebase:

```
grep -r "trigger" src/ --include="*.ts" | head -5
```

no prior "trigger" term found in the hooks module. however, the term is descriptive: it answers "what triggers this boot hook?"

**verdict:** acceptable. no extant term to prefer over "trigger". the term documents itself.

## conclusion

all new names follow extant conventions:

| category | convention | new names |
|----------|------------|-----------|
| module constants | SCREAMING_SNAKE | VALID_BOOT_EVENTS |
| local variables | camelCase | bootTrigger, claudeEvents, buildEntry, translations |
| supplier briefs | howto.use.brain.{topic}.md | howto.use.brain.hooks.md |
| claude-specific | claude prefix | claudeEvents |

no divergence from extant conventions found.
