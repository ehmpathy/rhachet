# review: behavior-declaration-coverage (r4)

## verdict: pass

## primary deliverables checklist

| deliverable | status | evidence |
|-------------|--------|----------|
| 1. BrainBootsAdapter interface + Claude Code implementation | done | `src/domain.objects/BrainBootsAdapter.ts`, `src/_topublish/.../boots/` |
| 2. Config dir structure `.agent/.brain/$brain/config/scope=$scope/` | done | `genBrainConfigDir.ts:23-30` |
| 3. `rhx init claude --hooks` generates config | done | `invokeInit.ts:120-162` |
| 4. `rhx enroll claude` spawns with CLAUDE_CONFIG_DIR | done | `enrollBrainCli.ts:29-33` |
| 5. `rhx upgrade` regenerates config after role upgrade | done | `invokeUpgrade.ts:50-75` |
| 6. Boot hook validation removed | done | `assertRegistryBootHooksDeclared.ts` deleted, callers removed |

## config dir contents checklist

Blueprint line 38: "creates with CLAUDE.md, settings.json, .credentials.json symlink"

| file | status | implementation |
|------|--------|----------------|
| CLAUDE.md | done | `claudeMd.dao.ts:27` writes CLAUDE.md |
| settings.json | done | `genBrainConfigDir.ts:38` |
| .credentials.json | done | `genBrainBootsAdapterForClaudeCode.ts:42-44` creates symlink |
| .gitignore (scoped) | done | `genBrainConfigDir.ts:43-45` |

## CLI contract checklist

| command | status |
|---------|--------|
| `rhx init claude --hooks` | done |
| `rhx init claude --hooks --roles X` | done |
| `rhx enroll claude --roles X` + CLAUDE_CONFIG_DIR | done |
| `rhx upgrade` + regenerate | done |

## conclusion

All requirements from vision, criteria, and blueprint are implemented. No gaps found.
