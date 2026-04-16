# self-review: has-questioned-assumptions (round 4)

## question

what technical assumptions are hidden in the blueprint? are they evidence-based or habit-based? what exceptions or counterexamples exist?

## deep dive methodology

for each assumption:
1. state the assumption
2. find evidence in criteria/vision
3. ask "what if the opposite were true?"
4. check for exceptions or counterexamples
5. render verdict

---

## assumption 1: inits.exec roles don't need boot hook

**what we assume:** roles with only `inits.exec` (no briefs.dirs, no skills.dirs) pass without boot hook.

**evidence check:**
- criteria usecase.6: "given(registry with role that has inits.exec but no briefs.dirs or skills.dirs) then(introspect succeeds)"
- vision edgecase: "role with inits but no briefs/skills dirs | no hook needed"

**is the blueprint handling this?**
- blueprint test case [case5]: "role with typed skills only (no dirs) → returns empty"
- no explicit test case for inits-only role!

**gap found:** blueprint test coverage lacks inits-only case. need test case for role with `inits.exec` but no `briefs.dirs` or `skills.dirs`.

**what if opposite true?** what if inits.exec roles DID require boot hook?
- inits run on `rhx init`, not on SessionStart
- boot hook is for SessionStart briefs/skills loading
- inits are fundamentally different mechanism

**verdict:** assumption holds. **but blueprint test coverage incomplete** — need explicit inits-only test case.

---

## assumption 2: bootable signal = briefs.dirs OR skills.dirs

**what we assume:** a role is "bootable" if it has `briefs.dirs` OR `skills.dirs`.

**evidence check:**
- vision line: "briefs.dirs or skills.dirs declared → onBoot hook required"
- criteria usecase.3: "role that has skills.solid but no briefs.dirs or skills.dirs" → no hook needed

**counterexample search:**
- what about `skills.fluid`? is that bootable?
- what about future `briefs.solid`?

**analysis:**
- extant types: `skills.dirs`, `skills.solid`, `skills.rigid`, `skills.fluid`
- `skills.dirs` = filesystem path to .sh files → boots via SessionStart
- `skills.solid/rigid/fluid` = typescript exports → imported directly via code
- same pattern for briefs: `briefs.dirs` = filesystem → boots; typed briefs would be imports

**verdict:** holds — the distinction is filesystem-based dirs vs code-based exports. dirs need boot, typed exports don't.

---

## assumption 3: empty briefs.dirs array = still requires hook

**what we assume:** `briefs: { dirs: [] }` requires onBoot hook (declaration is signal, not contents).

**evidence check:**
- criteria boundary: "given(role with empty briefs.dirs array []) then(introspect requires onBoot hook) sothat(declaration of dirs, not contents, is the signal)"

**is the blueprint handling this?**
- blueprint codepath: "briefsDirs = extractDirUris(role.briefs.dirs) if declared"
- `if declared` is key — but what does "declared" mean for empty array?
- need clarity: is `briefs: { dirs: [] }` considered "declared"?

**code analysis needed:**
```ts
// what does extractDirUris return for empty array?
extractDirUris([]) // returns []

// how does hasBootableContent check this?
briefsDirs.length > 0 // would be false for empty array!
```

**gap found:** if we check `briefsDirs.length > 0`, empty array would NOT trigger the guard. but criteria says empty array SHOULD require hook.

**what if opposite true?** what if empty array should NOT require hook?
- role author declares intent to have dirs
- but hasn't added content yet
- should they be forced to add hook before content?

**criteria is explicit:** "declaration of dirs, not contents, is the signal"

**verdict:** assumption holds per criteria. **but implementation may have bug** — need to check for property presence, not array content:
```ts
// correct: check if property is declared
const hasBriefsDirs = role.briefs?.dirs !== undefined;
// incorrect: check if array has content
const hasBriefsDirs = extractDirUris(role.briefs.dirs).length > 0;
```

---

## assumption 4: empty onBoot array = no hook

**what we assume:** `hooks.onBrain.onBoot = []` is treated as "no hook".

**evidence check:**
- criteria boundary: "empty onBoot is not valid declaration"
- blueprint: "hooks?.onBrain?.onBoot.length > 0"

**what if opposite true?** what if empty array IS valid declaration?
- semantically: empty array = "i have a boot hook that does zero operations"
- practically: this achieves no effect, same as undefined

**verdict:** holds — criteria explicitly specifies this.

---

## assumption 5: copy extractDirUris, don't extract

**what we assume:** copy the function to new file, don't make shared utility.

**evidence check:**
- wet-over-dry rule: "wait for 3+ usages before abstraction"
- current usages: findNonExecutableShellSkills (1) + our new file (2)

**what if extractDirUris has a bug?**
- now two copies of the bug
- fixes must happen in two places

**counterargument:**
- if bug exists, we'd fix both anyway
- premature abstraction is worse than copy-paste

**what if we need to change extractDirUris?**
- if change is for ONE usage, copy isolation is good
- if change is for BOTH usages, we'd extract then

**verdict:** holds — follows wet-over-dry rule. 2 usages < 3 threshold.

---

## assumption 6: assertion ordering doesn't matter

**what we assume:** `assertRegistryBootHooks` can be inserted after `assertRegistrySkillsExecutable`.

**blueprint insertion point:**
```ts
assertRegistrySkillsExecutable({ registry });
assertRegistryBootHooks({ registry });  // NEW
```

**what if order matters?**
- both are independent guards
- both take same input (registry)
- neither modifies registry
- output of one doesn't feed into other

**what if we reverse order?**
- boot hook error would show before skill executable error
- user sees one error at a time anyway (failfast)
- no functional difference

**what if skills check depends on boot hook?**
- it doesn't — skills check looks at file permissions
- boot hook check looks at role config

**verdict:** holds — guards are independent, order is arbitrary.

---

## assumption 7: RoleBootHookViolation uses boolean flags

**what we assume:** `{ hasBriefsDirs: boolean, hasSkillsDirs: boolean }` not `{ dirs: string[] }`.

**trade-off analysis:**
- boolean: simpler, sufficient for error message "has: briefs.dirs, skills.dirs"
- dirs array: more info, could list actual paths

**what does error need?**
- vision example: "has: briefs.dirs, skills.dirs" — just names, not paths
- no requirement to show actual dir paths

**what if we need paths later?**
- we'd refactor then (YAGNI)
- paths don't help user fix the issue (they need to add hook, not modify dirs)

**verdict:** holds — boolean is simpler and sufficient for requirements.

---

## assumption 8: test fixture needs dedicated package

**what we assume:** create `with-roles-package-no-hook` fixture directory.

**alternative:** modify extant `with-roles-package` to have configurable onBoot?

**analysis:**
- extant fixture is used by other tests that expect valid registry
- conditional logic in fixture adds complexity
- dedicated fixture is isolated and clear

**what if we have many test fixtures?**
- fixture explosion is a real concern
- but one fixture per failure case is manageable
- we only need ONE invalid fixture (no hook)

**verdict:** holds — dedicated fixture is cleaner than conditional logic.

---

## conclusion: gaps found and fixed

| assumption | status | action taken |
|------------|--------|--------------|
| briefs OR skills = bootable | holds | none needed |
| empty onBoot = no hook | holds | none needed |
| copy extractDirUris | holds | none needed |
| assertion order independent | holds | none needed |
| boolean flags in violation | holds | none needed |
| dedicated test fixture | holds | none needed |
| **inits-only roles pass** | holds | **fixed: added test case [case6]** |
| **empty briefs.dirs array** | holds | **fixed: added test case [case9] + implementation note** |

---

## fixes applied to blueprint

### fix 1: added test case for inits-only role

**gap:** criteria usecase.6 requires inits-only roles to pass without boot hook, but blueprint had no test case.

**fix applied:** added `[case6] | positive | role with inits.exec only (no dirs) → returns empty` to findRolesWithBootableButNoHook test coverage.

### fix 2: added test case for empty briefs.dirs array

**gap:** criteria boundary condition says empty array still requires hook, but blueprint had no test case.

**fix applied:** added `[case9] | edge | empty briefs.dirs array [] → returns violation` to findRolesWithBootableButNoHook test coverage.

### fix 3: clarified bootable content detection logic

**gap:** blueprint codepath used extractDirUris which could miss empty array case.

**fix applied:**
- updated codepath tree to show explicit property presence check:
  ```
  hasBriefsDirs = role.briefs?.dirs !== undefined
  hasSkillsDirs = role.skills?.dirs !== undefined
  ```
- added implementation note in blueprint:
  > **critical:** check property presence, not array content.
  > per criteria boundary condition: "declaration of dirs, not contents, is the signal"

---

## verdict

**pass** — assumptions are evidence-based. two gaps found and fixed in blueprint:
1. test case [case6] for inits-only role (criteria usecase.6)
2. test case [case9] for empty briefs.dirs array (criteria boundary)
3. implementation note clarifies property presence check

