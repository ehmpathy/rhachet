# review.self: behavior-declaration-adherance

## question: does implementation match spec exactly?

### review each changed file

#### file 1: findRolesWithBootableButNoHook.ts

**spec says**: find roles with bootable content but no valid boot hook

**implementation**:
- line 30-44: checks `briefs.dirs` or `skills.dirs` for bootable content
- line 51-57: checks `hooks.onBrain.onBoot` presence
- line 65-72: checks for `roles boot` command in hook
- line 74-81: checks for `--role <slug>` in hook

**adherance**: ✓ exact match to spec

#### file 2: assertRegistryBootHooksDeclared.ts

**spec says**: throw BadRequestError with turtle vibes treestruct

**implementation**:
- line 8: imports `BadRequestError`
- line 21-35: builds treestruct message with `🐢 bummer dude...`
- line 37: throws `BadRequestError`

**adherance**: ✓ exact match to spec

#### file 3: invokeRepoIntrospect.ts

**spec says**: call guard after registry load, before manifest write

**implementation**:
- line ~45: `assertRegistryBootHooksDeclared({ registry })` after other guards

**adherance**: ✓ exact match to spec

#### file 4: blackbox/.test/assets/with-roles-package/index.js

**spec says**: extant fixture must have valid hooks

**implementation**:
- added `hooks.onBrain.onBoot` array with valid command

**adherance**: ✓ extant tests continue to pass

#### file 5: blackbox/.test/assets/with-roles-package-no-hook/

**spec says**: need fixture without hooks to test failure

**implementation**:
- created fixture with briefs.dirs and skills.dirs but no hooks

**adherance**: ✓ exact match to spec

#### file 6: repo.introspect.acceptance.test.ts

**spec says**: test case for no-hook failure

**implementation**:
- case9 tests all criteria: exit code, bummer message, role slug, reason, hint

**adherance**: ✓ exact match to spec

### conclusion

every file adheres to spec. no deviations or misinterpretations found.

