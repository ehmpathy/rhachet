# review: has-consistent-mechanisms (r3)

## verdict: consistent — verified via code inspection

searched codebase for hook-related patterns. verified each addition follows extant patterns exactly.

## verification method

1. grepped for `onBoot|onTool|onStop` to find all hook-related files
2. read each implementation file to compare patterns
3. verified onTalk additions are structurally identical

## detailed verification

### syncOneRoleHooksIntoOneBrainRepl.ts (lines 95-145)

extant pattern (onBoot, lines 96-106):
```typescript
for (const h of onBrain.onBoot ?? []) {
  hooks.push(
    new BrainHook({
      author,
      event: 'onBoot',
      command: h.command,
      timeout: h.timeout,
      filter: h.filter,
    }),
  );
}
```

added pattern (onTalk, lines 135-145):
```typescript
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

**structurally identical** — only the event string differs.

### why no abstraction

the blueprint did not prescribe a refactor. the extant code uses explicit for-loops for each event type. onTalk follows this pattern.

a DRY-er approach would be:
```typescript
for (const event of ['onBoot', 'onTool', 'onStop', 'onTalk'] as const) {
  for (const h of onBrain[event] ?? []) { ... }
}
```

this was NOT done because:
1. blueprint prescribed additive changes only
2. extant code uses explicit loops
3. rule.prefer.wet-over-dry applies

## files searched

- src/domain.operations/brains/syncOneRoleHooksIntoOneBrainRepl.ts ✓
- src/_topublish/rhachet-brains-anthropic/src/hooks/translateHook.ts ✓
- src/_topublish/rhachet-brains-anthropic/src/hooks/genBrainHooksAdapterForClaudeCode.ts ✓
- src/_topublish/rhachet-brains-opencode/src/hooks/config.dao.ts ✓

## conclusion

all mechanisms follow extant patterns. no duplication, no new abstractions.
