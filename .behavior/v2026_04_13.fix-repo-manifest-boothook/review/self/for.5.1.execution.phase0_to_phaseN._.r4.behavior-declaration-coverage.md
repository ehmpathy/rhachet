# review.self: behavior-declaration-coverage

## question: are all behavior requirements covered?

### from wish (0.wish.md)

| wish requirement | code location | covered? |
|------------------|---------------|----------|
| "repo introspect should failfast" | `invokeRepoIntrospect.ts` calls `assertRegistryBootHooksDeclared` | ✓ |
| "guard against roles that dont have a boot hook declared" | `findRolesWithBootableButNoHook.ts` | ✓ |
| "this has turned out to be a footgun" | guard prevents footgun | ✓ |
| "check theres an explicit `onBoot` hook to boot that role" | validates hook presence + content + role name | ✓ |
| "make it clear, lets failfast for now" | throws `BadRequestError`, no auto-fix | ✓ |
| "role authors will know they need to add it" | error includes hint command | ✓ |
| "full chain is explicit and not magic" | no implicit hook creation | ✓ |

### checks implemented (from code)

| check | implementation |
|-------|---------------|
| hook presence | `hooks?.onBrain?.onBoot` exists and non-empty |
| hook content | contains `roles boot` command |
| hook correctness | contains `--role <roleSlug>` for this role |

### three violation reasons (from blueprint)

| reason | implemented? | test coverage? |
|--------|-------------|----------------|
| `no-hook-declared` | ✓ line 51-57 | ✓ case2-5 in unit tests |
| `absent-roles-boot-command` | ✓ line 65-72 | ✓ case8 in unit tests |
| `wrong-role-name` | ✓ line 74-81 | ✓ case9 in unit tests |

### acceptance test coverage (from criteria)

| criterion | test assertion |
|-----------|---------------|
| exits non-zero | `expect(result.status).not.toEqual(0)` |
| stderr includes "bummer dude" | `expect(result.stderr).toContain('bummer dude')` |
| stderr includes role slug | `expect(result.stderr).toContain('mechanic')` |
| stderr includes reason | `expect(result.stderr).toContain('no-hook-declared')` |
| stderr includes hint | `expect(result.stderr).toContain('roles boot --role')` |

### conclusion

all behavior requirements are covered. no gaps detected.

