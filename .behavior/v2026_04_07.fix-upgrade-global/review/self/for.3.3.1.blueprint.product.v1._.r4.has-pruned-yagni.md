# self-review: has-pruned-yagni (r4)

## reflection

i examined each component in the blueprint for YAGNI violations. for each, i asked:
- was this explicitly requested in vision or criteria?
- is this the minimum viable way to satisfy the requirement?
- did we add abstraction "for future flexibility"?
- did we add features "while we're here"?
- did we optimize before we knew it was needed?

## component review

### component 1: --which flag with three values

**explicitly requested?** yes.
- wisher: "only --which local|global|both"
- vision usecase.2: "explicit control (--which)"

**minimum viable?** yes — three values for three behaviors.

**future flexibility added?** no — exactly what was requested.

**verdict:** not YAGNI. explicit request.

---

### component 2: detectInvocationMethod.ts

**explicitly requested?** yes.
- wisher: "npx rhx = local only; rhx = global and local"
- vision usecase.3: "npx → local only"

**minimum viable?** yes — one env var check.

**future flexibility added?** no — no abstraction layer, no config, no extensibility hooks.

**verdict:** not YAGNI. explicit request.

---

### component 3: getGlobalRhachetVersion.ts

**explicitly requested?** derived from vision.
- vision usecase.4: "already current → no network call"
- criteria usecase.4: "no unnecessary network calls"

**minimum viable?** examined:
- could we skip version check and always run `npm i -g`? yes — but violates vision usecase.4.
- version check is one npm command — minimal.

**future flexibility added?** no — returns version or null, no abstraction.

**did we optimize before needed?** the vision explicitly asks for this:
> "sothat(upgrade is fast when already up to date)"

**verdict:** not YAGNI. satisfies explicit vision requirement.

---

### component 4: execNpmInstallGlobal.ts

**explicitly requested?** yes.
- wish: "upgrade global rhachet by default"
- vision usecase.1: "upgrades global rhachet"

**minimum viable?** yes — one npm command with structured result.

**future flexibility added?** no — no abstraction, no config.

**verdict:** not YAGNI. core feature.

---

### component 5: EPERM check alongside EACCES

**explicitly requested?** no — discovered in assumption review.

**minimum viable?** yes — one additional string check.

**future flexibility added?** no — just handles Windows alongside Unix.

**verdict:** not YAGNI. enables cross-platform support without abstraction.

---

### component 6: structured result { upgraded, hint }

**explicitly requested?** derived from edge case.
- vision edge case: "global fails → warn, don't block"
- criteria usecase.3: "surfaces hint for manual global upgrade"

**minimum viable?** examined:
- could we just throw on failure? no — violates "don't block local"
- could we return boolean only? no — need hint for user guidance
- { upgraded, hint } is minimal shape

**future flexibility added?** no — no extra fields, no abstraction.

**verdict:** not YAGNI. minimal shape for requirements.

---

### component 7: acceptance tests

**explicitly requested?** required by briefs.
- rule.require.test-coverage-by-grain: "contract → acceptance test"

**minimum viable?** 6 test cases for 6 criteria usecases. no extra cases.

**future flexibility added?** no.

**verdict:** not YAGNI. required coverage.

---

### component 8: npx + --which global error case

**explicitly requested?** yes.
- criteria usecase.2: "fails with clear error"

**minimum viable?** one error branch with message.

**future flexibility added?** no — just the error case.

**verdict:** not YAGNI. explicit criteria requirement.

---

## search for hidden extras

### did we add abstraction "for future flexibility"?

scanned blueprint for:
- interfaces beyond immediate need: none found
- config options not requested: none found
- plugin systems: none found
- extensibility hooks: none found

### did we add features "while we're here"?

scanned blueprint for:
- output format beyond requirements: none — uses extant treestruct
- extra CLI flags: none — only --which as requested
- extra test cases: none — one per criteria usecase

### did we optimize before needed?

examined:
- version check before global install: justified by vision usecase.4
- no cache layer: correct — not requested
- no parallel execution: correct — serial is simpler, no perf requirement

---

## components flagged for deletion

none.

every component traces to:
1. explicit wisher request
2. vision requirement
3. criteria requirement
4. brief rule

---

## summary

| component | request source | minimum viable? | extras? |
|-----------|----------------|-----------------|---------|
| --which flag | wisher | yes | no |
| detectInvocationMethod | wisher | yes | no |
| getGlobalRhachetVersion | vision | yes | no |
| execNpmInstallGlobal | wish | yes | no |
| EPERM check | assumption review | yes | no |
| { upgraded, hint } | criteria | yes | no |
| acceptance tests | brief rule | yes | no |
| npx error case | criteria | yes | no |

## conclusion

zero YAGNI violations. all components are minimum viable implementations of explicit requirements.

