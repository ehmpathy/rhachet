# R3 — `repo=.this` budget has no trigger

**status:** 🔴 broken

## .what broke

before #553: `.agent/.actors/actor.via.slug=.default/brain/.claude/settings.json` held
`rhachet roles boot --repo .this --role any --if-present` under SessionStart. every session ran it,
and `bootRoleResources` gated it — so an over-budget `.agent/repo=.this/role=any/boot.yml` halted
at session start.

after #553: that hook is gone (see the settings.json conflict), and `.this` reaches context only via
`setBrainDirBoot` → `getOneRoleBootContent`, which renders and never measures. `.this` is never
linked by `repo manifest`, so R1 cannot reach it either.

## .the key fact every option rests on

`boot.md` is a **render**, not a live read. an edit to a `.this` brief or `boot.yml` reaches a
session **only** after the next `init` · `upgrade` · `roles link` · `enroll`. ⇒ the render is the
one door into context — a gate there is complete for the resident payload.

## .options

| # | option | catches | cost | verdict |
|---|---|---|---|---|
| A | ⭐ gate inside `setBrainDirBoot`: render each role via `genBootPayload`, then `assertBootWithinBudget`. on breach, keep the prior `boot.md`, name the overage, exit 2 through main's `asExitCodeForBrainDirSyncFailures` | `.this` + every linked role, at every render (incl. `prepare`→`init` on install) | zero per session | recommend. also closes R4 + R6 |
| B | CI floor: `roles cost --all` exits 2 on any over-budget spec, wired into `test:lint` | `.this` + `.behavior/*` + `.route/*` specs, per PR | zero per session | recommend beside A — catches what never rendered locally |
| C | memoized stop hook (role-declared under `repo=.this/role=any`, fingerprint of boot.yml + said-file `mtime:size` in `.agent/.cache`, count tokens only on a miss, `.agent/repo=.this` scope only) | an edit between renders | a stat walk per stop; a count on each miss | not needed for budget (A is complete). its real catch is **staleness** — an edit `boot.md` does not yet hold. if built, it should say *"re-render"*, not *"over budget"* |
| D | brain-dir sum budget (a cap on the whole `boot.md`) | R9 | zero per session | separate decision; see R9 |

## .why not C first

- `rule.forbid.framework-owned-hooks` measured the prior stop hook at **2,223ms** per stop and exit 2
  on fixtures; a memo fixes the cost, not the premise
- a stop hook detects **after** the payload was resident; A refuses **before** it is written — the
  wish's requirement 2 (*halt before a byte is emitted*) holds only at A
- a stop hook is legal only when a role declares it; A needs no hook at all
