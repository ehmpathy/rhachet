# review: has-consistent-conventions (r4)

## verdict: consistent — verified via grep inspection

grepped for `on[A-Z][a-z]+` patterns in domain.objects. found clear convention.

## verification method

1. grepped domain.objects for hook event patterns
2. compared extant vs added names
3. verified doc comment style matches

## evidence

### grep output

```
src/domain.objects/BrainHookEvent.ts:
export type BrainHookEvent = 'onBoot' | 'onTool' | 'onStop' | 'onTalk';

src/domain.objects/RoleHooksOnBrain.ts:
  onBoot?: RoleHookOnBrain[];
  onTool?: RoleHookOnBrain[];
  onStop?: RoleHookOnBrain[];
  onTalk?: RoleHookOnBrain[];
```

### pattern analysis

all events follow `on<Moment>` where `<Moment>` is a lifecycle moment:
- `onBoot` — when session boots
- `onTool` — when tool invoked
- `onStop` — when session stops
- `onTalk` — when user talks

### doc comment style

extant pattern:
```typescript
/**
 * hooks that fire when the brain boots up
 */
onBoot?: RoleHookOnBrain[];
```

added pattern:
```typescript
/**
 * hooks that fire when the user submits a prompt
 */
onTalk?: RoleHookOnBrain[];
```

same structure: single-line description of when hook fires.

## conclusion

all conventions match. `onTalk` follows the extant `on<Moment>` pattern.
