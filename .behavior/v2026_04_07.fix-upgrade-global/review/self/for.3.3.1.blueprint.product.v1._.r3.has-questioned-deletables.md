# self-review: has-questioned-deletables (r3)

## reflection

i examined each feature and component in the blueprint. for each, i asked:
- does it trace to a requirement?
- did the wisher ask for it?
- can it be deleted or simplified?

## features review

### feature 1: --which flag

**traces to:**
- vision usecase.2: "explicit control (--which)"
- criteria usecase.1: `--which local`, `--which global`, `--which both`

**wisher request:** yes, explicit:
> "dont add rhx upgrade --no-global; only --which local|global|both"

**deletable?** no — explicit wisher request.

**why it holds:** not an assumption. wisher specified the exact flag shape.

---

### feature 2: detectInvocationMethod

**traces to:**
- vision usecase.3: "npx → local only"
- criteria usecase.2: "npx rhachet upgrade → local only"

**wisher request:** yes, explicit:
> "ideally, if they run npx rhx upgrade though, we'd know its local only"
> "npx rhx = local only; rhx = global and local"

**deletable?** no — enables the default behavior difference the wisher requested.

**why it holds:** wisher explicitly asked for npx detection to enable local-only default.

---

### feature 3: getGlobalRhachetVersion

**traces to:**
- vision usecase.4: "already current → no network call"
- criteria usecase.4: "no unnecessary network calls" with "sothat(upgrade is fast when already up to date)"

**wisher request:** not explicitly. this is derived from the vision requirement.

**deletable?** examined this carefully:
- the core wish is "upgrade global rhachet by default"
- the version check is a performance optimization
- without it: `npm i -g rhachet@latest` still hits registry even when current
- with it: one local `npm list -g` check potentially saves a network call

**could we delete and add back if needed?** yes — if users complained about slow upgrades when already current.

**decision:** keep. traces to vision usecase.4. minimal implementation (one function).

**why it holds:** vision explicitly says "upgrade is fast when already up to date" — version check fulfills this.

---

### feature 4: execNpmInstallGlobal

**traces to:**
- wish: "rhx upgrade should also upgrade global rhachet by default"
- vision usecase.1: "upgrades global rhachet"
- vision edge case: "global fails → warn, don't block"
- criteria usecase.3: "warns about global upgrade failure"

**deletable?** no — this IS the core feature.

**why it holds:** this is THE wish. cannot delete.

---

### feature 5: npx + --which global error

**traces to:**
- criteria usecase.2: `when(npx rhachet upgrade --which global) then(fails with clear error)`

**deletable?** could we silently skip instead? examined:
- user explicitly requested `--which global`
- npx cannot upgrade global (no global install)
- silent skip would be a surprise
- explicit error respects user intent

**decision:** keep. explicit error is better UX.

**why it holds:** user explicitly requested unavailable capability — error is correct response.

---

### feature 6: acceptance tests

**traces to:**
- rule.require.test-coverage-by-grain: "contract → acceptance test + snapshots"

**deletable?** no — required by brief rules.

**why it holds:** not optional per test coverage requirements.

---

## components review

### component 1: detectInvocationMethod.ts

**can be deleted?** no — feature 2 requires it.

**simplest version:** current design is already minimal:
```typescript
const npmExecPath = process.env.npm_execpath;
if (npmExecPath) return 'npx';
return 'global';
```

one file, one function, one if statement.

**why it holds:** cannot simplify further.

---

### component 2: getGlobalRhachetVersion.ts

**can be deleted?** see feature 3 analysis above. keeps for performance per vision.

**simplest version:** current design is minimal:
1. run `npm list -g rhachet --depth=0 --json`
2. parse json
3. return version or null

**why it holds:** minimal implementation of a real requirement.

---

### component 3: execNpmInstallGlobal.ts

**can be deleted?** no — feature 4 requires it.

**simplest version:** current design is minimal:
1. run `npm install -g`
2. check exit status
3. return structured result with hint if EACCES

could we inline into execUpgrade.ts? no — single responsibility. the EACCES error case deserves its own testable unit.

**why it holds:** separated concern, testable, minimal.

---

### component 4: upgrade.acceptance.test.ts

**can be deleted?** no — required by test coverage rules.

**simplest version:** 6 test cases that cover the 6 criteria usecases. no bloat.

**why it holds:** required coverage.

---

## what can be deleted?

after review: none.

every feature traces to:
1. explicit wisher request in conversation (features 1, 2, 4)
2. vision requirement (feature 3)
3. criteria requirement (feature 5)
4. brief rule (feature 6)

no features are assumptions without traceability.

---

## what can be simplified?

examined each component:

| component | current | simpler possible? |
|-----------|---------|-------------------|
| detectInvocationMethod | 1 env check | no |
| getGlobalRhachetVersion | 1 npm command + json parse | no |
| execNpmInstallGlobal | 1 npm command + structured result | no |
| acceptance tests | 6 cases for 6 criteria | no |

no over-engineered code detected.

---

## open questions for wisher?

none. all features trace to explicit requests or documented requirements.

---

## conclusion

zero deletables. all features and components trace to wisher requests, vision requirements, criteria requirements, or brief rules.

