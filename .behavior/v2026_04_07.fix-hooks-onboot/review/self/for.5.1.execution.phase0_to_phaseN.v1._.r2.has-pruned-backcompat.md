# review: has-pruned-backcompat (r2)

## verdict: no backwards compat added — why it holds

this is a purely additive feature. backwards compat code is not needed because:

1. **no extant contracts were changed**
   - `BrainHookEvent` union expanded — all prior values still valid
   - `RoleHooksOnBrain.onTalk` is optional — roles without it still valid
   - EVENT_MAP grew — prior mappings unchanged

2. **no migration needed**
   - roles that don't declare onTalk: no change in behavior
   - settings.json without UserPromptSubmit: still valid
   - opencode plugins without onTalk: still valid

3. **the blueprint explicitly prescribed additive-only**
   - blueprint.product.v1 shows only `[+]` markers (additive)
   - no `[~]` markers for modified behavior
   - no deprecation or migration mentioned in vision

## line-by-line verification

### BrainHookEvent.ts
```typescript
export type BrainHookEvent = 'onBoot' | 'onTool' | 'onStop' | 'onTalk';
//                                                           ^^^^^^^^ added
```
pure union expansion. typescript unions are additive-safe.

### RoleHooksOnBrain.ts
```typescript
onTalk?: RoleHookOnBrain[];  // added as optional
```
optional property. extant objects without it remain valid.

### syncOneRoleHooksIntoOneBrainRepl.ts
```typescript
for (const h of onBrain.onTalk ?? []) { /* ... */ }
```
nullish coalesce handles undefined. roles without onTalk produce empty iteration.

### translateHook.ts
```typescript
const EVENT_MAP = {
  onBoot: 'SessionStart',
  onTool: 'PreToolUse',
  onStop: 'Stop',
  onTalk: 'UserPromptSubmit',  // added
};
```
object literal expansion. extant keys unchanged.

## why no fallbacks needed

a fallback would be needed if:
- old consumers read new data (they don't — onTalk is new)
- new code reads old data (it does — via `?? []` nullish coalesce)

the nullish coalesce `onBrain.onTalk ?? []` is NOT backwards compat — it's standard optional property access that would exist even if this were the first version.

## conclusion

no backwards compat code was added because none was needed. the feature is purely additive with no behavior changes to extant functionality.
