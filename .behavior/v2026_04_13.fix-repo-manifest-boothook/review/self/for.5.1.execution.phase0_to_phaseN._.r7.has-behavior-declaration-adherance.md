# review.self: has-behavior-declaration-adherance

## question: does implementation adhere to behavior declarations?

### adherance to wish intent

the wish stated:
> "we should just make it clear. lets failfast for now"

**adherance check:**
- ✓ failfast — throws BadRequestError, stops introspect
- ✓ clear — error shows role, reason, hint
- ✓ not magic — no auto-add of hooks

### adherance to vision constraints

the vision stated:
> "check that theres an explicit `onBoot` hook to boot that role"

**adherance check:**
- ✓ checks `hooks.onBrain.onBoot` presence
- ✓ checks hook contains `roles boot` command
- ✓ checks hook boots correct role (`--role <slug>`)

### adherance to criteria matrix

| criteria row | adherance |
|--------------|-----------|
| role with briefs.dirs but no hook → fail | ✓ tested in case9 |
| role with skills.dirs but no hook → fail | ✓ tested in unit tests |
| role with both briefs.dirs and skills.dirs, no hook → fail | ✓ tested in unit tests |
| role with valid hook → pass | ✓ tested in case7 |

### adherance to blueprint

the blueprint specified:
- three violation reasons
- turtle vibes treestruct output
- hint with example command

**adherance check:**
- ✓ `no-hook-declared`, `absent-roles-boot-command`, `wrong-role-name`
- ✓ `🐢 bummer dude...` header
- ✓ hint shows `npx rhachet roles boot --role <slug>`

### verdict

implementation adheres to all behavior declarations. no deviations detected.

