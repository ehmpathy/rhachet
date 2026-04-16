# review.self: has-behavior-declaration-coverage

## question: does implementation cover all behavior declarations?

### from wish (0.wish.md)

| requirement | implemented | location |
|-------------|-------------|----------|
| failfast guard for `repo introspect` | ✓ | `invokeRepoIntrospect.ts` calls `assertRegistryBootHooksDeclared` |
| check for explicit `onBoot` hook | ✓ | `findRolesWithBootableButNoHook.ts` checks `hooks.onBrain.onBoot` |
| check that hook boots THAT role | ✓ | validates `--role <roleSlug>` in command |
| not magic — explicit | ✓ | no auto-add, just failfast with clear hint |
| prevent footgun at build time | ✓ | fails at `repo introspect` invocation |

### from vision (1.vision.stone)

| requirement | implemented |
|-------------|-------------|
| guard against roles that have bootable content but no boot hook | ✓ |
| roles with briefs.dirs or skills.dirs need explicit onBoot hook | ✓ |
| hook must boot that specific role | ✓ |

### from criteria (2.1.criteria.blackbox.stone)

| criterion | covered |
|-----------|---------|
| exit non-zero on violation | ✓ case9 tests |
| stderr includes role slug | ✓ case9 tests |
| stderr includes violation reason | ✓ case9 tests |
| stderr includes hint | ✓ case9 tests |

### verdict

all behavior declarations are covered. no gaps detected.

