# review: role-standards-adherance (r7)

## verdict: pass

## briefs directories checked

| category | briefs path | relevance |
|----------|-------------|-----------|
| lang.terms | `practices/lang.terms/rule.forbid.gerunds.md` | all code files |
| operation grains | `practices/define.domain-operation-grains.md` | domain.operations files |
| comment rules | `practices/rule.require.why-comments.md` | all code |

## issue from r6

**fixed in r6:** removed orphan `findRolesWithBootableButNoHook.ts` files.

## verification: gerund check

Verified no gerunds in new source files:

| file | status |
|------|--------|
| `src/domain.objects/BrainBootsAdapter.ts` | pass |
| `src/domain.objects/BrainBootsAdapterDao.ts` | pass |
| `src/domain.operations/init/genBrainConfigDir.ts` | pass |
| `src/domain.operations/config/getBrainBootsAdapterByConfigImplicit.ts` | pass |
| `src/_topublish/.../boots/genBrainBootsAdapterForClaudeCode.ts` | pass |
| `src/_topublish/.../boots/genClaudeMdContent.ts` | pass |
| `src/_topublish/.../boots/claudeMd.dao.ts` | pass |

## verification: operation grains

| file | declared grain | actual behavior | status |
|------|----------------|-----------------|--------|
| genBrainConfigDir.ts | orchestrator | calls adapter.genBootContent, adapter.dao.set, writeFile | correct |
| genClaudeMdContent.ts | orchestrator | loops roles, calls bootRoleResources | correct |
| claudeMd.dao.ts | communicator | readFile/writeFile | correct |
| getBrainBootsAdapterByConfigImplicit.ts | communicator | discovers npm packages, loads adapter | correct |

## verification: comment standards

All doc comments use `.what`, `.why`, `.note` format. No inline what-comments found.

## why this holds

The fix from r6 was applied (orphan files deleted). All other new code follows mechanic standards for gerunds, operation grains, and comment format.
