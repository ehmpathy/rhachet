# self-review r12: has-role-standards-adherance

## what i reviewed

i read the actual source files and verified the blueprint's proposed changes follow mechanic role standards. i checked each standard against the real code patterns.

---

## source verification

### translateHook.ts (lines 1-119)

i verified this transformer follows mechanic standards:

**rule.require.arrow-only:**
- line 33: `export const translateHookToClaudeCode = (input: {` — arrow function
- line 82: `export const translateHookFromClaudeCode = (input: {` — arrow function
- **holds:** both functions are arrow functions

**rule.require.input-context-pattern:**
- line 33-35: `(input: { hook: BrainHook })` — single input object
- line 82-86: `(input: { event: string; entry: ClaudeCodeHookEntry; author: string; })` — single input object
- **holds:** both use (input) pattern

**rule.require.what-why-headers:**
- lines 29-31: has `.what` and `.why` JSDoc
- lines 78-80: has `.what` and `.why` JSDoc
- **holds:** both functions have headers

**rule.forbid.else-branches:**
- lines 54-76: uses if-early-return, no else
- lines 90-98: uses if-early-return, no else
- **holds:** no else branches

**blueprint adherance:**
the blueprint proposes to add `onTalk: 'UserPromptSubmit'` to EVENT_MAP (line 23-27). this is a single line addition to a record. no new functions, no new patterns. the change follows the extant pattern exactly.

### extractDeclaredHooks (syncOneRoleHooksIntoOneBrainRepl.ts lines 94-124)

i verified the extant pattern:

```typescript
// extract onBoot hooks
for (const h of onBrain.onBoot ?? []) { hooks.push(new BrainHook({...})); }

// extract onTool hooks
for (const h of onBrain.onTool ?? []) { hooks.push(new BrainHook({...})); }

// extract onStop hooks
for (const h of onBrain.onStop ?? []) { hooks.push(new BrainHook({...})); }
```

**rule.require.narrative-flow:**
- each block is a code paragraph with single-line comment
- blocks are separated by blank lines
- **holds:** follows narrative pattern

**rule.forbid.inline-decode-friction:**
- `onBrain.onBoot ?? []` is simple nullish fallback, not decode-friction
- `hooks.push(new BrainHook({...}))` is a named constructor, not decode-friction
- **holds:** no complex inline transformations

**blueprint adherance:**
the blueprint proposes to add a parallel for-loop:
```typescript
// extract onTalk hooks
for (const h of onBrain.onTalk ?? []) { hooks.push(new BrainHook({...})); }
```

this follows the extant pattern exactly. same comment style, same for-loop structure, same nullish fallback.

### RoleHooksOnBrain.ts (lines 1-25)

i verified the extant pattern:

```typescript
export interface RoleHooksOnBrain {
  onBoot?: RoleHookOnBrain[];
  onTool?: RoleHookOnBrain[];
  onStop?: RoleHookOnBrain[];
}

public static nested = {
  onBoot: RoleHookOnBrain,
  onTool: RoleHookOnBrain,
  onStop: RoleHookOnBrain,
};
```

**rule.forbid.undefined-attributes:**
- optional properties (?) are correct for optional hook declarations
- undefined means "role does not declare this hook type"
- **holds:** optional is semantically correct

**rule.require.domain-driven-design:**
- `RoleHooksOnBrain` extends `DomainLiteral<RoleHooksOnBrain>`
- uses domain-objects class pattern
- nested map enables hydration
- **holds:** follows domain object pattern

**blueprint adherance:**
the blueprint proposes to add:
- `onTalk?: RoleHookOnBrain[];` to interface
- `onTalk: RoleHookOnBrain` to nested

both follow the extant pattern exactly.

---

## grain verification

| file | grain | test type | correct? |
|------|-------|-----------|----------|
| translateHook.ts | transformer (pure) | unit tests | ✓ |
| config.dao.ts (anthropic) | communicator (i/o) | integration tests | ✓ |
| genBrainHooksAdapterForClaudeCode.ts | communicator (i/o) | integration tests | ✓ |
| syncOneRoleHooksIntoOneBrainRepl.ts | orchestrator | integration tests | ✓ |
| config.dao.ts (opencode) | communicator (i/o) | integration tests | ✓ |

**rule.require.test-coverage-by-grain:**
- transformers get unit tests (translateHook)
- communicators get integration tests (all daos and adapters)
- orchestrators get integration tests (sync)
- **holds:** blueprint declares correct test types

---

## anti-pattern verification

| standard | checked against | holds? |
|----------|-----------------|--------|
| rule.require.arrow-only | translateHook.ts lines 33, 82 | ✓ |
| rule.require.input-context-pattern | translateHook.ts lines 33-35, 82-86 | ✓ |
| rule.require.what-why-headers | translateHook.ts lines 29-31, 78-80 | ✓ |
| rule.forbid.else-branches | translateHook.ts lines 54-76, 90-98 | ✓ |
| rule.require.narrative-flow | extractDeclaredHooks lines 95-124 | ✓ |
| rule.forbid.inline-decode-friction | extractDeclaredHooks lines 96-124 | ✓ |
| rule.forbid.undefined-attributes | RoleHooksOnBrain.ts lines 9-13 | ✓ |
| rule.require.test-coverage-by-grain | blueprint test tree | ✓ |

---

## verdict

**PASSED.** i verified the blueprint against actual source code. each proposed change follows the extant pattern exactly. no violations of mechanic standards found.
