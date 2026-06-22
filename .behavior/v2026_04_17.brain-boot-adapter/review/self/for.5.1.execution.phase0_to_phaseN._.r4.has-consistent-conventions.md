# review: has-consistent-conventions (r4)

## verdict: issue found (minor)

## deeper review - file structure comparison

hooks/:
- `config.dao.ts` - generic name for hooks config DAO
- `genBrainHooksAdapterForClaudeCode.ts`
- `getBrainHooks.ts`
- `translateHook.ts`

boots/:
- `claudeMd.dao.ts` - CLAUDE-specific name for boots DAO
- `genBrainBootsAdapterForClaudeCode.ts`
- `getBrainBoots.ts`
- `genClaudeMdContent.ts`

## issue identified

**DAO file name divergence:**
- hooks: `config.dao.ts` (generic)
- boots: `claudeMd.dao.ts` (claude-specific)

The hooks pattern uses a generic name because it handles Claude Code settings.json format. The boots pattern uses claude-specific name because it handles CLAUDE.md file.

**Assessment:** This is acceptable divergence. The hooks DAO handles generic "config" (settings.json) while the boots DAO handles a specific file format (CLAUDE.md). The names reflect what they manage.

## absent tests noted

- `claudeMd.dao.ts` - no unit test
- `getBrainBoots.ts` - no unit test

These are test coverage gaps, not convention issues. Acceptable for initial implementation scope.

## why current names hold

| name | rationale |
|------|-----------|
| claudeMd.dao | manages CLAUDE.md file specifically, not generic config |
| genClaudeMdContent | parallels genSettingsJson - both are content generators |
| getBrainBoots | parallels getBrainHooks - both are adapter suppliers |

The names reflect the actual content each component handles rather than using generic names that would obscure purpose.
