# review.self: behavior-declaration-adherance (round 6)

## deeper scrutiny: verify each line matches spec intent

### file 1: findRolesWithBootableButNoHook.ts

**line-by-line review:**

| line | code | spec match? |
|------|------|-------------|
| 30-44 | `hasBootableContent` checks `briefs?.dirs` and `skills?.dirs` | wish: "roles that dont have a boot hook declared" but have bootable content |
| 56-64 | checks `hooks?.onBrain?.onBoot` presence and non-empty | wish: "check theres an explicit `onBoot` hook" |
| 67-72 | regex `/\broles\s+boot\b/` | wish: "explicit `onBoot` hook to boot that role" |
| 75-82 | regex `--role\\s+${roleSlug}` | wish: "boot that role" (not just any role) |

**why it holds:**
- transformer pattern: pure function, no side effects
- returns array of violations (not boolean) for rich error report
- three distinct violation reasons enable specific hints per case
- no false positives: roles without bootable content are skipped at line 104

### file 2: assertRegistryBootHooksDeclared.ts

**line-by-line review:**

| line | code | spec match? |
|------|------|-------------|
| 61-70 | calls `findRolesWithBootableButNoHook`, early return if empty | only failfast when violations exist |
| 77-92 | builds treestruct with `🐢 bummer dude...` | matches ergonomist treestruct format |
| 94-96 | throws `BadRequestError` | wish: "failfast" + user can fix this (not a code bug) |

**why it holds:**
- orchestrator pattern: delegates detection to transformer, owns presentation
- `BadRequestError` signals caller-must-fix (not server-must-fix)
- violations passed as metadata for programmatic access
- hint per violation type guides the fix

### file 3: invokeRepoIntrospect.ts integration

**location:** line 86, after `assertRegistrySkillsExecutable({ registry })`

**why it holds:**
- called after registry is loaded (line ~50)
- called before manifest is written (line ~120)
- consistent with other guard calls at same layer

### file 4: test case9 in acceptance test

**assertions verified:**
- exit code non-zero (line 370-371)
- stderr contains "bummer dude" (line 374-375)
- stderr contains role slug "mechanic" (line 378-379)
- stderr contains reason "no-hook-declared" (line 382-383)
- stderr contains hint "roles boot --role" (line 386-387)

**why it holds:**
- all criteria from spec are covered
- fixture `with-roles-package-no-hook` has briefs.dirs and skills.dirs but no hooks

### no deviations found

every implementation detail traces to a specific part of the wish:

| wish phrase | implementation |
|-------------|----------------|
| "failfast" | throws `BadRequestError` |
| "guard against roles" | transformer finds violations |
| "check theres an explicit `onBoot` hook" | `validateBootHook` function |
| "to boot that role" | checks `--role <slug>` in command |
| "make it clear" | error message with hint |
| "role authors will know they need to add it" | hint includes exact command |
| "full chain is explicit and not magic" | no auto-fix, just failfast |

### conclusion

implementation adheres exactly to spec. no junior drifts or misinterpretations detected.

