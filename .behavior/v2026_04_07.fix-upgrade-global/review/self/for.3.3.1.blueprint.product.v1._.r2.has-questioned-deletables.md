# self-review: has-questioned-deletables (r2)

## reflection

i examined each feature and component in the blueprint, asking:
- does it trace to a requirement?
- did the wisher ask for it?
- can it be deleted or simplified?

## features review

### feature: --which flag

**traces to:**
- vision usecase.2: "explicit control (--which)"
- criteria usecase.1: `--which local`, `--which global`, `--which both`

**deletable?** no. wisher requested explicit control via conversation:
> "dont add rhx upgrade --no-global; only --which local|global|both"

**why it holds:** explicit request from wisher. not an assumption.

### feature: detectInvocationMethod

**traces to:**
- vision usecase.3: "npx → local only"
- criteria usecase.2: "npx rhachet upgrade → local only"

**deletable?** no. wisher requested this via conversation:
> "ideally, if they run npx rhx upgrade though, we'd know its local only"
> "npx rhx = local only; rhx = global and local"

**why it holds:** explicit request from wisher. detection enables default behavior difference.

### feature: getGlobalRhachetVersion

**traces to:**
- vision usecase.4: "already current → no network call"
- criteria usecase.4: "no unnecessary network calls"

**deletable?** examined this carefully. the wisher did not explicitly request "skip if already current". but the vision says:
> "sothat(upgrade is fast when already up to date)"

this is a performance optimization, not a core feature. however, running `npm i -g rhachet@latest` when already at latest still makes a network call. the version check avoids that.

**simplification possible?** could rely on npm's built-in behavior. but npm @latest still queries the registry. the version check is one local command (`npm list -g`) to potentially save a network call.

**decision:** keep. traces to vision usecase.4. not over-engineered — one simple function.

### feature: execNpmInstallGlobal

**traces to:**
- vision usecase.1: "upgrades global rhachet"
- vision edge case: "global fails → warn, don't block"
- criteria usecase.3: "warns about global upgrade failure"

**deletable?** no. this is the core feature requested in the wish:
> "rhx upgrade should also upgrade global rhachet by default"

**why it holds:** this is THE feature. cannot delete.

### feature: npx + --which global error

**traces to:**
- criteria usecase.2: `when(npx rhachet upgrade --which global) then(fails with clear error)`

**deletable?** could we silently ignore instead of error? no — the user explicitly requested global. silent skip would be surprising.

**why it holds:** explicit error is better UX than silent skip when user explicitly requested unavailable capability.

### feature: acceptance tests

**traces to:**
- rule.require.test-coverage-by-grain: "contract → acceptance test + snapshots"

**deletable?** no. required by test coverage rules. contracts must have acceptance tests.

**why it holds:** not optional per briefs.

## components review

### component: detectInvocationMethod.ts

**can be deleted?** could we hardcode default to 'both' and let users use --which? no — the vision explicitly requires different defaults:
- npx → local only
- rhx → both

**simplest version:** current design is already minimal — one env var check.

**why it holds:** one file, one function, one if statement. cannot simplify further.

### component: getGlobalRhachetVersion.ts

**can be deleted?** examined above. keeps to avoid unnecessary network calls per vision usecase.4.

**if we deleted and had to add back?** yes — users would complain about slow upgrades when already current.

**simplest version:** current design is minimal — one npm command, json parse.

**why it holds:** minimal implementation of a real requirement.

### component: execNpmInstallGlobal.ts

**can be deleted?** no. this is THE core feature.

**simplest version:** current design is minimal:
1. run npm install -g
2. check status
3. return structured result

could we merge into execUpgrade.ts inline? no — single responsibility. also, the EACCES error case deserves its own testable unit.

**why it holds:** separated concern, testable, minimal.

### component: upgrade.acceptance.test.ts

**can be deleted?** no. required by test coverage rules.

**simplest version:** 6 test cases covering the criteria usecases. no bloat.

**why it holds:** required coverage.

## what can be deleted?

after review: none.

every feature traces to:
1. explicit wisher request in conversation, or
2. vision requirement, or
3. criteria requirement, or
4. brief rule (test coverage)

## what can be simplified?

examined each component. all are minimal implementations:
- detectInvocationMethod: 1 env var check
- getGlobalRhachetVersion: 1 npm command + json parse
- execNpmInstallGlobal: 1 npm command + structured result

no over-engineering detected.

## open questions for wisher?

none. all features trace to explicit requests or documented requirements.

## conclusion

zero deletables. all features and components trace to requirements. no over-engineering detected.

