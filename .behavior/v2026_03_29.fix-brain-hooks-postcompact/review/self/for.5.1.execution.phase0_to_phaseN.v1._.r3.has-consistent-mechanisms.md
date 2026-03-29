# self-review: has-consistent-mechanisms (r3)

## question

do new mechanisms duplicate extant functionality or follow extant patterns?

## the review process

i searched the codebase for related patterns and traced each new mechanism to verify consistency.

## search: error patterns

searched `UnexpectedCodePathError` in src/:

```
found 20+ files using UnexpectedCodePathError:
- src/domain.operations/weave/enweaveOneStitcher.ts
- src/domain.operations/template/getTemplatePathByCallerPath.ts
- src/domain.operations/keyrack/unlockKeyrackKeys.ts
- ... (20+ more)
```

**verdict:** UnexpectedCodePathError is the standard error for invariant violations. the new throw at translateHook.ts:73 follows this pattern exactly.

## search: array return patterns

searched `Array<{` in rhachet-brains-anthropic:

```
found 2 files:
- src/hooks/config.dao.ts:10      # hooks: Array<{
- src/hooks/translateHook.ts:37   # }: Array<{ event: string; entry: ... }>
```

**note:** translateHookFromClaudeCode already returns `BrainHook[]` (line 96). the forward translator now also returns an array. this creates symmetry — both directions return arrays.

## found: 5 new mechanisms

### 1. VALID_BOOT_EVENTS constant (line 13-17)

```ts
const VALID_BOOT_EVENTS = ['SessionStart', 'PreCompact', 'PostCompact'] as const;
```

**why it holds:** this constant serves validation (line 69: `.includes()`). extracting to a named constant avoids repetition between validation and wildcard expansion. the `as const` pattern is standard typescript for literal unions.

### 2. UnexpectedCodePathError throw (line 73-76)

```ts
throw new UnexpectedCodePathError(
  `invalid filter.what value for onBoot: ${bootTrigger}`,
  { hook, validValues: VALID_BOOT_EVENTS },
);
```

**why it holds:** follows extant pattern. 20+ files use UnexpectedCodePathError for invariant violations. includes metadata (`validValues`) for debuggability.

### 3. array return type (line 37)

```ts
}): Array<{ event: string; entry: ClaudeCodeHookEntry }> => {
```

**why it holds:** translateHookFromClaudeCode returns `BrainHook[]`. the forward translator now also returns an array. symmetry between forward and reverse translation reduces cognitive load.

### 4. del method multi-bucket search (line 169-174)

```ts
const claudeEvents: string[] =
  event === 'onBoot'
    ? ['SessionStart', 'PreCompact', 'PostCompact']
    : event === 'onTool' ? ['PreToolUse'] : ['Stop'];
```

**why it holds:** this is a necessary divergence from prior single-bucket lookup. when onBoot has filter.what=*, the hook exists in all three buckets. del must search all buckets to remove it. the alternative — require filter.what in del query — would change the query contract and break callers.

### 5. upsert loop pattern (line 114)

```ts
for (const { event, entry } of translations) {
```

**why it holds:** standard for...of iteration. the prior code handled a single return; this handles an array. no new abstraction introduced — just iteration.

## found: no duplication

i searched for extant utilities that could replace these mechanisms:

- no extant boot event validation utility
- no extant multi-bucket delete utility
- array iteration is standard js, not a candidate for extraction

## conclusion

five mechanisms added. all follow extant patterns (UnexpectedCodePathError, array return) or introduce necessary divergence with clear rationale (multi-bucket search). no duplication with extant utilities. the code is consistent with codebase conventions.
