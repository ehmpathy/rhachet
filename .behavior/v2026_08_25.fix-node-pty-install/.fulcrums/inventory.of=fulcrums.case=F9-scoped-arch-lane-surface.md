# F9 — the scoped arch lanes read `src/`, and only `src/`

- **rework**     = clean
- **confidence** = 89%
- **status**     = ⏳ open — taken at i046, offered for rework
- **where**      = the four manual re-runs behind `.review/i046.r00{4,5,6,7}.scoped.*.md`

## .the fork, stated fairly

lanes r004–r007 (the four architect rubrics) went dark on a context overflow, so
`rule.always.rerun-dark-review-lanes-scoped` owes a **scoped re-run**. the rule prescribes the
shape but not the surface — `--paths-with 'src/<subsystem>/**/*.ts'` is its template, and the
subsystem is mine to pick.

so the fork is: **which files do the arch lanes actually read?**

| candidate surface | files | what it buys | what it costs |
|---|---|---|---|
| 🟢 **taken** — `--diffs since-main` ∩ `src/**/*.ts` − tests | **30** | exactly my changed production source | drops `blackbox/`, `package.json` |
| the guard's own — `--diffs since-main`, unscoped | 145 | fidelity to the guard | ⛔ **overflows at 108.1%** — this is the defect |
| `src/**/*.ts` with no diff intersect | 785 | whole-repo arch sweep | ⛔ reads code I never touched — measured |

## .what was taken, and why, at the time

**taken: intersect the guard's own `--diffs since-main` with `src/**/*.ts`, minus tests.**

the middle row is what the lanes did, and it is what broke, so it is not available. the choice is
really between the first and third, and the third was **measured rather than reasoned about**: a
first pass ran `--paths-with 'src/**/*.ts'` with no diff intersect, drew 785 files, and returned 10
blockers — of which the first three named `detectBrainReplsInRepo.ts`, `executeInit.ts`, and
`executeSkill.ts`, none of which this branch touches.

⇒ that is precisely the attribution failure `rule.forbid.scope-leaks` names, and the same brief's
`## ⚠️ .then check attribution per file` clause anticipates it. the intersect retires it by
construction: a file absent from the diff cannot be flagged.

## .why the rework is clean

it ripples to no source and no test. the surface is an argument on a command, so a wider re-run is
one invocation and the extra verdicts append beside the extant four. naught downstream reads which
glob produced them.

## .why the confidence is 89% rather than higher

the 11% is one specific omission, and it is stated rather than hidden: **`blackbox/.test/infra/`
is excluded twice over** — once by `src/**`, once by `--paths-wout '**/*.test.ts'`.

that directory carries real production-shaped code (`spawnRhachetCliBackground.ts`), and this branch
modified it. an architect who grades decomposition could fairly hold that test **infrastructure**
is not a test, and that its grain deserves the same read as `src/`.

the counter, and why the guess stands: the four rubrics grade **domain-operation grain** — the
transformer / communicator / orchestrator taxonomy of `define.domain-operation-grains` — which is a
`src/` vocabulary. and the acceptance surface already has its own lane (`ergo-friction-hazards`,
r009) plus a full acceptance suite that exercises it end to end.

⚠️ **if the wisher prefers the arch lanes to reach test infrastructure, that is a clean instruction
to take** — the cost is one re-run per rubric with `'{src,blackbox}/**/*.ts'` and `--paths-wout`
narrowed to `'**/*.acceptance.test.ts'`.

## .the verdict

⏳ open. the four lanes are lit and their verdicts are recorded; the surface they read is offered
to widen at the wisher's call.
