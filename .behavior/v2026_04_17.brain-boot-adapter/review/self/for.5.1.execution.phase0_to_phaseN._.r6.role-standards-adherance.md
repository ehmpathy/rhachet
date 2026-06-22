# review: role-standards-adherance (r6)

## verdict: pass (issue fixed)

## briefs directories checked

Relevant mechanic standards:
- `practices/lang.terms/rule.forbid.gerunds.md` - no gerunds in code
- `practices/define.domain-operation-grains.md` - transformer/communicator/orchestrator separation
- comment standards - minimal, why-not-what

## issue found and fixed

**orphan file detected:**

`findRolesWithBootableButNoHook.ts` was left in codebase after `assertRegistryBootHooksDeclared.ts` was deleted.

**roadmap phase 4 stated:**
> - [ ] remove `src/domain.operations/manifest/findRolesWithBootableButNoHook.ts` (if exists)

**fix applied:**
```bash
git rm src/domain.operations/manifest/findRolesWithBootableButNoHook.ts
git rm src/domain.operations/manifest/findRolesWithBootableButNoHook.test.ts
```

## gerund check

Searched for common gerunds in new files:

| file | gerunds | status |
|------|---------|--------|
| genBrainConfigDir.ts | none | pass |
| genClaudeMdContent.ts | none | pass |
| claudeMd.dao.ts | none | pass |
| genBrainBootsAdapterForClaudeCode.ts | none | pass |

## operation grain verification

| file | grain | evidence |
|------|-------|----------|
| genBrainConfigDir.ts | orchestrator | calls adapter methods, mkdir, writeFile |
| genClaudeMdContent.ts | orchestrator | loops over roles, calls bootRoleResources |
| claudeMd.dao.ts | communicator | raw file i/o |
| genBrainBootsAdapterForClaudeCode.ts | factory | returns adapter object |

## comment standards

All new files use `.what`, `.why`, `.note` doc format. No what-comments found inline.

## conclusion

One orphan file fixed. All other code follows mechanic standards.
