# self-review: has-questioned-requirements

## requirement 1: failfast at repo introspect time

**who said this was needed?** the wish author.

**when/why?** to prevent footgun where roles are linked but never boot.

**what if we didn't do this?** roles would continue to silently fail at runtime. users would link roles, expect them to work, and wonder why briefs never load.

**is scope right?** yes. build-time is the earliest moment where we have all the information (the registry is loaded). a build-time guard prevents the footgun from ever reached users.

**simpler way?** the wish considered "auto-add hook" but explicitly chose failfast because "the full chain is explicit and not 'magic'".

**verdict:** ✓ holds

---

## requirement 2: check for boot field specifically

**who said this was needed?** my interpretation of "onBoot hook".

**when/why?** i assumed `boot: { uri }` is the signal that a role is bootable.

**what if we didn't do this?** we'd need another mechanism to signal bootability.

**potential issue:** the wish says "onBoot hook" but i check for `boot` field. are these the same?

**investigation:**
- `role.boot` = path to boot.yml (what to boot)
- `role.hooks.onBrain.onBoot` = brain hooks (different purpose)
- SessionStart hook = registered by init (when to boot)

the wish says "explicit `onBoot` hook to boot that role" — this refers to the mechanism that triggers `npx rhachet roles boot`, not the brain hooks.

the boot field is the declaration of "this role has boot configuration". without it, `roles boot` would still work (boots all briefs/skills from dirs), but the role author hasn't explicitly declared boot intent.

**verdict:** ✓ holds — a check for `boot: { uri }` is the right signal. it means the role author consciously configured what to boot.

---

## requirement 3: roles without boot must be removed from registry

**who said this was needed?** the wish: "if they want to make their role not bootable, then it shouldn't be in the registry to begin with"

**when/why?** to keep a clean invariant: registry = bootable roles.

**what if we didn't do this?** registry would contain mixed bootable/non-bootable roles. users would have to guess which roles work and which are "library" roles.

**is scope right?** yes, per the wish.

**simpler way?** could allow `boot: null` as explicit "no boot", but the wish prefers removal. the friction is intentional.

**verdict:** ✓ holds

---

## requirement 4: error message format

**who said this was needed?** me, to follow treestruct output pattern.

**when/why?** consistent UX with other rhachet errors.

**what if we didn't do this?** error would still work, just less polished.

**is scope right?** yes, ergonomics matter.

**simpler way?** could just list roles without tree structure, but tree is more scannable.

**verdict:** ✓ holds

---

## possible gap: what about roles with empty boot.yml?

**observation:** a role could have `boot: { uri }` that points to an empty or minimal boot.yml. this would pass validation but effectively be the same as no boot.

**question:** should we also validate that boot.yml is non-empty?

**decision:** no. an empty boot.yml is a valid choice — it means "boot this role's briefs/skills with defaults". the presence of the field is what matters, not its contents.

**verdict:** ✓ no change needed

---

## summary

all requirements hold after the review:

| requirement | verdict |
|-------------|---------|
| failfast at introspect | ✓ holds |
| check boot field | ✓ holds |
| remove non-bootable from registry | ✓ holds |
| treestruct error format | ✓ holds |

no issues found. vision is ready for human review.
