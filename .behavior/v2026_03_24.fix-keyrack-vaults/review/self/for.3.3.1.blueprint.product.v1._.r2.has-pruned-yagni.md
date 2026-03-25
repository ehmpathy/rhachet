# self-review: has-pruned-yagni

## stone
3.3.1.blueprint.product.v1

## question
did we add components not explicitly requested? YAGNI check.

## review

### component: isOpCliInstalled.ts

**requested?** yes — the vision says "op cli not installed → failfast exit 2 with instructions"

**minimum viable?** yes — a boolean check is the simplest form. no abstraction added.

**verdict:** needed.

### component: EPHEMERAL_SESSION mech

**requested?** yes — the vision says "mech=EPHEMERAL_SESSION" explicitly in the output example.

**minimum viable?** yes — just a new enum value.

**verdict:** needed.

### component: PERMANENT_VIA_EXID mech

**requested?** yes — the vision says "mech=PERMANENT_VIA_EXID" explicitly in the output example.

**minimum viable?** yes — just a new enum value.

**verdict:** needed.

### component: roundtrip validation

**requested?** yes — the vision says "validates roundtrip via `op read $exid`" and criteria says "validates roundtrip via `op read $exid`... sothat broken exids fail fast at set time"

**minimum viable?** yes — one `op read` call.

**verdict:** needed.

### component: ubuntu install instructions

**requested?** yes — the vision shows the full error output with ubuntu install steps. criteria says "displays ubuntu install instructions"

**minimum viable?** borderline — could just link to 1password docs. but the vision shows inline steps.

**verdict:** needed per vision. the vision explicitly prescribes the output format.

### component: skip host manifest for os.daemon

**requested?** yes — the wish says "without persistent storage in any vault". the vision says "no disk writes" and "pure ephemeral"

**minimum viable?** yes — skip a write call.

**verdict:** needed.

### component: grades/inferKeyGrade.ts changes

**requested?** maybe not — the blueprint says "[~] grades/inferKeyGrade.ts — verify os.daemon and 1password grades"

**question:** was grade inference explicitly requested? the vision doesn't mention grades.

**analysis:** grades determine security classification. os.daemon keys are ephemeral with no encryption. 1password keys inherit external security. grade inference may need update to handle these vaults.

**verdict:** unclear — this might be YAGNI. the vision focuses on set/unlock/get flow, not grade inference. flagged for review at execution time. if tests pass without changes, skip this file.

### component: genContextKeyrackGrantUnlock.ts changes

**requested?** yes — this file maps vault names to adapters. os.daemon and 1password adapters need to be registered here for unlock to route correctly.

**verdict:** needed.

### component: setKeyrackKey.ts changes

**requested?** yes — this file orchestrates set. needs to skip manifest for os.daemon and handle 1password exid return.

**verdict:** needed.

## issues found

1. **grades/inferKeyGrade.ts** — unclear if needed. may be YAGNI. flagged for execution phase: verify if tests require this change.

## verdict

all components are needed except grades/inferKeyGrade.ts which is flagged as potentially YAGNI. will verify at execution time.
