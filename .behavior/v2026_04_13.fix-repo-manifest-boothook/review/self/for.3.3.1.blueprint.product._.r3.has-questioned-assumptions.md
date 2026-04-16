# self-review: has-questioned-assumptions (round 3)

## question

what technical assumptions are hidden in the blueprint? are they evidence-based or habit-based?

## assumption 1: briefs.dirs OR skills.dirs = bootable

**what we assume:** if a role has EITHER briefs.dirs OR skills.dirs, it is bootable.

**what if opposite true?** what if BOTH are required to be bootable?

**evidence check:**
- vision line: "briefs.dirs or skills.dirs declared → onBoot hook required"
- criteria matrix: separate rows for briefs-only, skills-only, both
- wisher intent: prevent roles with ANY bootable content from absent hook

**verdict:** holds — vision explicitly says "or", not "and"

---

## assumption 2: empty onBoot array = no hook

**what we assume:** `hooks.onBrain.onBoot = []` is treated as "no hook"

**what if opposite true?** what if empty array is valid declaration?

**evidence check:**
- criteria boundary condition: "empty onBoot is not valid declaration"
- semantic reason: empty array has no hooks to execute, same effect as undefined

**verdict:** holds — criteria explicitly specifies this

---

## assumption 3: copy extractDirUris, don't extract to shared utility

**what we assume:** copy the function to new file, don't make shared utility

**evidence check:**
- wet-over-dry rule: "wait for 3+ usages before abstraction"
- current usages: findNonExecutableShellSkills (1) + our new file (2)
- 2 < 3 → don't extract yet

**what if opposite true?** what if we extracted now?
- would create unnecessary abstraction for 2 usages
- would violate repo pattern

**verdict:** holds — follows wet-over-dry rule

---

## assumption 4: find + assert separation is better than inline

**what we assume:** separate find function is better than inline logic in assert

**is this evidence or habit?**

**evidence check:**
- extant pattern: assertRegistrySkillsExecutable calls findNonExecutableShellSkills
- but is extant pattern evidence? could be tech debt

**deeper analysis:**
- separation enables: unit test find logic with 8 test cases
- inline would require: test all 8 cases through assert function
- inline drawback: harder to isolate find logic bugs

**verdict:** holds — separation improves testability, not just habit

---

## assumption 5: violation type needs boolean flags

**what we assume:** `{ hasBriefsDirs: boolean, hasSkillsDirs: boolean }`

**alternative:** `{ dirs: string[] }` like `['briefs.dirs', 'skills.dirs']`

**trade-off analysis:**
- current: simpler for error message: `has: ${hasBriefsDirs ? 'briefs.dirs' : ''}...`
- alternative: more extensible if more dir types added later
- but: no evidence of more dir types planned

**verdict:** holds — current is simpler, no evidence for extensibility need

---

## assumption 6: error format uses treestruct

**what we assume:** error message uses turtle vibes treestruct format

**evidence check:**
- vision example shows exact treestruct format
- vision says "🐢 bummer dude..." and treestruct layout

**verdict:** holds — directly from vision

---

## conclusion

six technical assumptions found and questioned:

| assumption | evidence source | verdict |
|------------|-----------------|---------|
| briefs OR skills = bootable | vision "or" | holds |
| empty array = no hook | criteria boundary | holds |
| copy, don't extract | wet-over-dry rule | holds |
| find + assert separation | testability need | holds |
| boolean flags in violation | simplicity | holds |
| treestruct error format | vision example | holds |

all assumptions are evidence-based, not habit-based.

## verdict

**pass** — all assumptions traced to evidence.
