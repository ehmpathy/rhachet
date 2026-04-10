# self-review: has-pruned-yagni (r5)

## reflection

i re-examined the blueprint with fresh eyes for YAGNI violations. YAGNI = "you ain't gonna need it".

## component-by-component review

### 1. --which flag

**was this explicitly requested?** yes — wisher said: "only --which local|global|both"

**minimum viable?** yes — three values, no extras.

**why it holds:** exact match to wisher request. no additional values added.

---

### 2. detectInvocationMethod.ts

**was this explicitly requested?** yes — wisher said: "npx rhx = local only; rhx = global and local"

**minimum viable?** yes — one env var check, returns 'npx' or 'global'.

**why it holds:** simplest possible detection. no config, no abstraction layer.

---

### 3. getGlobalRhachetVersion.ts

**was this explicitly requested?** derived from vision usecase.4: "already current → no network call"

**minimum viable?** examined alternatives:
- skip version check, always run npm: simpler but violates vision
- version check: one npm command

the version check IS the minimum to satisfy "no unnecessary network calls".

**why it holds:** vision explicitly requires fast upgrade when current. this is the minimum implementation.

---

### 4. execNpmInstallGlobal.ts

**was this explicitly requested?** yes — wish: "upgrade global rhachet by default"

**minimum viable?** yes — one npm command, structured result.

**why it holds:** core feature. cannot remove.

---

### 5. { upgraded, hint } result shape

**was this explicitly requested?** derived from:
- vision: "global fails → warn, don't block"
- criteria: "surfaces hint for manual global upgrade"

**minimum viable?** yes — two fields, no extras.

**why it holds:** `upgraded` tells caller what happened. `hint` enables actionable guidance. both required.

---

### 6. EPERM alongside EACCES

**was this explicitly requested?** no — found in assumption review.

**minimum viable?** yes — one additional string check.

**why it holds:** enables Windows without abstraction. single line change.

---

### 7. acceptance tests

**was this explicitly requested?** yes — brief rule.require.test-coverage-by-grain.

**minimum viable?** yes — 6 cases for 6 criteria usecases.

**why it holds:** one test per requirement. no extra cases.

---

### 8. npx + --which global error

**was this explicitly requested?** yes — criteria usecase.2: "fails with clear error"

**minimum viable?** yes — one error branch.

**why it holds:** explicit criteria requirement.

---

## deeper examination: what could we remove?

### could we remove getGlobalRhachetVersion.ts?

**impact:** every `rhx upgrade` would hit npm registry even when current.

**vision says:** "sothat(upgrade is fast when already up to date)"

**verdict:** cannot remove. violates vision.

### could we inline execNpmInstallGlobal into execUpgrade?

**impact:** larger function, harder to test, mixed concerns.

**verdict:** separation is minimum — not premature abstraction.

### could we remove acceptance tests?

**impact:** violates brief rules.

**verdict:** cannot remove. required.

### could we remove EPERM check?

**impact:** Windows users get generic error instead of hint.

**verdict:** one line. worth the cross-platform support.

---

## what abstractions did we NOT add?

verified we avoided YAGNI:
- no config object for global install options
- no plugin system for package managers
- no version comparison logic (just check if installed)
- no retry mechanism
- no progress callbacks
- no custom error classes

---

## summary

| component | explicitly requested? | minimum viable? |
|-----------|----------------------|-----------------|
| --which flag | yes (wisher) | yes |
| detectInvocationMethod | yes (wisher) | yes |
| getGlobalRhachetVersion | yes (vision) | yes |
| execNpmInstallGlobal | yes (wish) | yes |
| { upgraded, hint } | yes (criteria) | yes |
| EPERM check | no (derived) | yes |
| acceptance tests | yes (brief) | yes |
| npx error case | yes (criteria) | yes |

## conclusion

zero YAGNI violations found.

every component is either:
1. explicitly requested by wisher
2. explicitly required by vision/criteria
3. required by brief rules
4. minimal cross-platform support (EPERM)

no components added "for future flexibility" or "while we're here".

