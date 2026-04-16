# self-review: has-pruned-backcompat (round 6)

## question

did we add backwards compatibility that was not explicitly requested?

## methodology

1. read the wish verbatim for backwards compat stance
2. read the vision for any migration path decisions
3. enumerate every potential backcompat concern in blueprint
4. for each: check if wisher explicitly requested it
5. flag any backcompat not explicitly requested

---

## the wisher's words on backwards compat

from wish `0.wish.md`:

> that said, if we plan to go nuclear and failfast for roles that dont declare it

> nah, we should just make it clear. lets failfast for now. the role authors will know they need to add it.

> that way the full chain is explicit and not 'magic'

**explicit stance from wisher:**
- "go nuclear and failfast" — no soft modes
- "failfast for now" — immediate enforcement
- "role authors will know" — no hand-hold
- "explicit and not magic" — no auto-fixes

---

## the vision's words on backwards compat

from vision `1.vision.yield.md`:

> **[answered] migration path** — zero migration path. failfast immediately. extant packages must add hooks.onBrain.onBoot.

**explicit stance from vision:**
- "zero migration path" — no phased rollout
- "failfast immediately" — no delay
- "extant packages must add hooks" — no exceptions

---

## backcompat concern enumeration

i will list every conceivable backcompat concern and check if the wisher requested it.

### concern 1: warn before error mode

**what it would be:** log a warn for first N runs, then start to error

**did wisher request it?** no. wisher said "failfast for now"

**verdict:** not requested, not present in blueprint — holds

### concern 2: --skip-boot-check flag

**what it would be:** cli flag to bypass the guard

**did wisher request it?** no. wisher said "explicit and not magic"

**verdict:** not requested, not present in blueprint — holds

### concern 3: env var to disable (RHACHET_SKIP_BOOT_CHECK)

**what it would be:** environment variable to bypass the guard

**did wisher request it?** no. vision says "zero migration path"

**verdict:** not requested, not present in blueprint — holds

### concern 4: grace period before enforcement

**what it would be:** date-gated or version-gated delay before guard activates

**did wisher request it?** no. vision says "failfast immediately"

**verdict:** not requested, not present in blueprint — holds

### concern 5: soft fail vs hard fail

**what it would be:** exit 0 with warn instead of exit != 0

**did wisher request it?** no. wisher said "failfast"

**verdict:** not requested, not present in blueprint — holds

### concern 6: allowlist for exempt roles

**what it would be:** config to exempt certain roles from the guard

**did wisher request it?** no. vision says "extant packages must add hooks"

**verdict:** not requested, not present in blueprint — holds

### concern 7: auto-add boot hooks for user

**what it would be:** automatically add the absent hook instead of error

**did wisher explicitly request it?** no, in fact wisher explicitly rejected this:

> maybe we should just by default have introspect add that hook?
> nah, we should just make it clear.

**verdict:** not requested (explicitly rejected), not present in blueprint — holds

### concern 8: deprecation notice before removal

**what it would be:** "this will be required in the next version" warn

**did wisher request it?** no. wisher said "failfast for now" not "warn first"

**verdict:** not requested, not present in blueprint — holds

---

## what IS in the blueprint

the blueprint contains:
1. guard that throws `BadRequestError` immediately
2. error message with role slugs and fix hint
3. no flags, no config, no escape hatches

this aligns with:
- wisher's "failfast" stance
- vision's "zero migration path" directive

---

## open questions for wisher

none. the wisher was explicit:
- "go nuclear and failfast" — confirms no soft modes
- "nah, we should just make it clear" — confirms no auto-fix
- "explicit and not magic" — confirms no hidden behavior

the vision crystallized this as "zero migration path, failfast immediately."

---

## conclusion

| potential backcompat | wisher requested? | present in blueprint? | holds? |
|---------------------|-------------------|----------------------|--------|
| warn before error | no | no | yes |
| --skip-boot-check flag | no | no | yes |
| env var to disable | no | no | yes |
| grace period | no | no | yes |
| soft fail | no | no | yes |
| allowlist for roles | no | no | yes |
| auto-add hooks | explicitly rejected | no | yes |
| deprecation notice | no | no | yes |

every conceivable backcompat concern was checked against the wisher's explicit words.

the wisher said "go nuclear and failfast" and explicitly rejected auto-fix ("nah, we should just make it clear").

the blueprint contains zero backwards compat — this aligns perfectly with the wisher's stated intent.

**verdict:** **pass** — no unprescribed backwards compat found. the blueprint is exactly as aggressive as the wisher requested.

