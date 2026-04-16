# self-review: has-pruned-backcompat (round 5)

## question

did we add backwards compatibility that was not explicitly requested?

## methodology

1. check vision for explicit backwards compat stance
2. check blueprint for any backwards compat concerns
3. verify each concern was prescribed

---

## vision stance on backwards compat

from vision `1.vision.yield.md`:

> **[answered] migration path** — zero migration path. failfast immediately. extant packages must add hooks.onBrain.onBoot.

**explicit stance:** no backwards compat. failfast immediately.

---

## search for backwards compat in blueprint

### potential backcompat: warn before error?

**check:** does blueprint add a warn mode before error?
- blueprint: throws BadRequestError immediately
- no warn mode, no deprecation period
- **verdict:** no backcompat added

### potential backcompat: --skip-boot-check flag?

**check:** does blueprint add a way to bypass the guard?
- blueprint: no flags or options
- guard runs unconditionally
- **verdict:** no backcompat added

### potential backcompat: grace period before enforcement?

**check:** does blueprint delay enforcement?
- blueprint: guard is immediate
- no version checks, no date gates
- **verdict:** no backcompat added

### potential backcompat: soft vs hard fail?

**check:** does blueprint allow soft fail?
- blueprint: throws BadRequestError (hard fail)
- prevents manifest generation
- **verdict:** no backcompat added

### potential backcompat: env var to disable?

**check:** does blueprint add RHACHET_SKIP_BOOT_CHECK or similar?
- blueprint: no env vars
- no escape hatches
- **verdict:** no backcompat added

### potential backcompat: config to allowlist roles?

**check:** does blueprint add way to exempt certain roles?
- blueprint: checks all roles in registry
- no allowlist, no exemptions
- **verdict:** no backcompat added

---

## blueprint alignment with vision

| vision says | blueprint does |
|-------------|----------------|
| zero migration path | failfast immediately |
| failfast immediately | throws BadRequestError |
| extant packages must fix | no escape hatches |

blueprint aligns with vision stance on backwards compat.

---

## cons section in vision

vision lists cons:
> - adds friction for role authors (must add hooks.onBrain.onBoot)
> - extant roles packages may need updates

vision acknowledges the friction. this is intentional, not accidental.

---

## conclusion

blueprint contains zero backwards compat concerns:
- no warn mode
- no skip flags
- no grace period
- no soft fail option
- no env var escape
- no allowlist exemptions

this aligns with vision's explicit "zero migration path, failfast immediately" stance.

**verdict:** **pass** — no unprescribed backwards compat found.

