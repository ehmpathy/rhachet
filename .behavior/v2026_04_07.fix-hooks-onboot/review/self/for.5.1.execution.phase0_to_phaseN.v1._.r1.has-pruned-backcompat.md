# review: has-pruned-backcompat

## verdict: no backwards compat added

all changes are purely additive. no backwards compatibility code was introduced.

## evidence

### change analysis

| file | change type | backcompat? |
|------|-------------|-------------|
| `BrainHookEvent.ts` | add `'onTalk'` to union | no — additive |
| `RoleHooksOnBrain.ts` | add optional `onTalk` | no — additive, optional property |
| `syncOneRoleHooksIntoOneBrainRepl.ts` | add extraction block | no — new loop, no fallback |
| `translateHook.ts` | add EVENT_MAP entry | no — additive |
| `config.dao.ts` (anthropic) | add UserPromptSubmit | no — additive |
| `genBrainHooksAdapterForClaudeCode.ts` | add del map entry | no — additive |
| `config.dao.ts` (opencode) | add regex + impl | no — additive |

### what was NOT added

- no fallback for old consumers
- no deprecation warnings
- no migration paths
- no "if old format then convert" logic
- no version checks

### why this is correct

the feature is purely additive:
- roles that don't declare `onTalk` continue to work unchanged
- `onTalk` is optional — no contract-break changes to extant roles
- no behavior changes for extant hooks

## conclusion

implementation is purely additive. no backwards compatibility code detected or needed.
