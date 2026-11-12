# split-plan — #659 into seven layer prs

#659 is too large for one review: about 100 min against a bar of 30 min per pr. this plan cuts it
into seven stacked prs in dependency order, base libs first, each under 30 min.

no commit, no push, no branch is made by this plan. each layer gets its own tree when a seat frees.

## .the review-time model

the 100 min estimate fits this model. the rates are a calibration, not a measurement:

| kind of line | rate | lines in #659 | min |
|---|---|---|---|
| prod code, plus the test harness code a suite runs on | 20 lines/min | ~840 | ~42 |
| tests and snapshots | 60 lines/min | ~2280 | ~38 |
| route record, briefs, dreams (skim) | 180 lines/min | ~3700 | ~20 |
| **total** | | **~6820** | **~100** |

every count below comes from `git diff --numstat origin/main...HEAD` at `cde79138`. where one file
splits across layers (`invokeInit.ts`, `invokeInit.integration.test.ts`, the two acceptance suites
and their snapshots), the share is counted from the hunk or the `given` block, and marked `≈`.

## .the layers

| # | pr | depends on | lines | review |
|---|---|---|---|---|
| L0 | test harness: the openai test context, the codediff prompt, the read-only grove proof | — | 252 | ~6 min |
| L1 | infra: a foreign lock cache is named | L0 | ≈ 390 | ~12 min |
| L2 | a `.claude` link that lands on the brain dir is accepted (the wish) | L0 | ≈ 670 | ~17 min |
| L3 | the preflight: a foreign link or an unwritable brain dir is refused before any role init | L2 | ≈ 1026 | ~21 min |
| L4 | a part-way init leaves no hooks for roles that never enrolled | L3 | ≈ 793 | ~23 min |
| L5 | a global rhx that differs from the pin is named | L1, L4 | ≈ 205 | ~4 min |
| L6 | the route record: vision, blueprint, verification, fulcrums, seeds, dreams | L5 | ≈ 3479 | ~19 min |

```
L0 ─┬─ L1 ────────────────────┐
    └─ L2 ── L3 ── L4 ────────┴── L5 ── L6
```

- **L0 merges first.** every layer's ci runs the openai suites, which F14 measured red on main's
  model. a layer based on main alone would go red for a cause it does not hold
- **L1 and L2 share no code**, so both may be in review at once
- **L3 and L4 are stacked** because both edit `invokeInit.ts` and the `init.preflight` suite
- **L5 needs `getOneRhxProvenance` from L1**, and lands after L4 to stay clear of the `invokeInit.ts`
  hunks

### L0 — test harness (~6 min)

| file | + | − |
|---|---|---|
| `src/.test/getContextOpenAI.ts` | 10 | 3 |
| `src/.test/stitchers/stitcherCodeDiffImagine.ts` | 44 | 3 |
| `src/domain.operations/weave/enweaveOneRoute.integration.test.ts` | 10 | 3 |
| `blackbox/cli/init.incremental.acceptance.test.ts` | 2 | 0 |
| `blackbox/cli/init.readonly-grove.acceptance.test.ts` | 124 | 0 |
| `blackbox/cli/__snapshots__/init.readonly-grove.acceptance.test.ts.snap` | 53 | 0 |
| **total** | **243** | **9** |

- fulcrum F14 rides here
- 🟡 main's model line now reads `gpt-4o-mini`, not F14's `gpt-4-turbo-2024-04-09`, so main moved
  after F14 was measured. this tree re-measures main's model before it keeps the dated pin; if
  main's line is green, the model hunk drops and only the `ConstraintError` hint stays
- 🟡 the read-only grove suite proves `rhachet-roles-ehmpathy` 1.39.7, which main already pins (no
  `package.json` hunk is left in #659). if its snapshot differs on this tree, the suite moves to L4,
  whose boots-then-hooks swap is the only change that could touch that screen

### L1 — infra: a foreign lock cache is named (~12 min)

| file | + | − |
|---|---|---|
| `src/infra/getOneRhxProvenance.ts` | 57 | 0 |
| `src/infra/getOneRhxProvenance.integration.test.ts` | 87 | 0 |
| `src/infra/lock/assertRepoMutexCacheFit.ts` | 73 | 0 |
| `src/infra/lock/assertRepoMutexCacheFit.integration.test.ts` | 84 | 0 |
| `src/infra/lock/withRepoMutex.ts` | 30 | 1 |
| `src/infra/lock/withRepoMutex.integration.test.ts` | 4 | 2 |
| `.agent/repo=.this/role=any/briefs/behavior/inventory.of=requirements.case=14.foreign-lock-cache-is-named.md` | 26 | 0 |
| `.agent/repo=.this/role=any/briefs/behavior/inventory.of=requirements.case=16.declared-lock-cache-boot-write-is-silent.md` | 24 | 0 |
| `.agent/repo=.this/role=any/briefs/behavior/inventory.of=requirements._.md` — rows 14, 16 | ≈ 2 | 0 |
| **total** | **≈ 387** | **3** |

- inventory cases 14 and 16 land with their proofs

### L2 — a `.claude` link that lands here is accepted (~17 min)

| file | + | − |
|---|---|---|
| `src/infra/getOneRealpathOrNull.ts` | 21 | 0 |
| `src/infra/getOneRealpathOrNull.integration.test.ts` | 56 | 0 |
| `src/domain.operations/init/boots/asRepoBrainDirIsFileError.ts` | 13 | 0 |
| `src/domain.operations/init/boots/asRepoBrainDirIsFileError.test.ts` | 21 | 0 |
| `src/domain.operations/init/boots/isRepoBrainDirSymlinkLegacy.ts` | 23 | 0 |
| `src/domain.operations/init/boots/assertRepoBrainDirSymlinkLandsHere.ts` | 61 | 0 |
| `src/domain.operations/init/boots/assertRepoBrainDirSymlinkLandsHere.integration.test.ts` | 141 | 0 |
| `src/domain.operations/init/boots/setRepoBrainDirSymlink.ts` | 13 | 43 |
| `src/domain.operations/init/boots/setRepoBrainDirSymlink.integration.test.ts` | 9 | 0 |
| `blackbox/cli/init.preflight.acceptance.test.ts` — the suite head + [case6] | ≈ 166 | 0 |
| `blackbox/cli/__snapshots__/init.preflight.acceptance.test.ts.snap` — [case6] t0, t1 | ≈ 75 | 0 |
| `.agent/repo=.this/role=any/briefs/behavior/inventory.of=requirements.case=12.claude-link-that-lands-here-is-accepted.md` | 27 | 0 |
| `.agent/repo=.this/role=any/briefs/behavior/inventory.of=requirements._.md` — row 12 | ≈ 1 | 0 |
| **total** | **≈ 627** | **43** |

- this is the layer that cures #657's refusal; its pr refs #657
- the `init.preflight` suite opens here under its final `describe` title, so later layers add
  `given` blocks and no snapshot key churns
- the suite head imports only what [case6] uses; each later layer adds its own imports

### L3 — the preflight refuses first (~21 min)

| file | + | − |
|---|---|---|
| `src/domain.operations/init/boots/assertRepoActorBrainDirWritable.ts` | 92 | 0 |
| `src/domain.operations/init/boots/assertRepoActorBrainDirWritable.integration.test.ts` | 127 | 0 |
| `src/domain.operations/init/boots/assertRepoActorBrainDirReadyForRoleInits.ts` | 26 | 0 |
| `src/domain.operations/init/boots/assertRepoActorBrainDirReadyForRoleInits.integration.test.ts` | 84 | 0 |
| `src/contract/cli/invokeInit.ts` — the preflight import and call | ≈ 7 | 0 |
| `src/contract/cli/invokeInit.integration.test.ts` — imports, the [t4] rework, [t5], [t6] | ≈ 100 | 11 |
| `src/domain.operations/upgrade/execUpgrade.ts` | 4 | 0 |
| `src/domain.operations/upgrade/execUpgrade.test.ts` | 11 | 0 |
| `blackbox/cli/init.preflight.acceptance.test.ts` — [case1], [case2], [case5] | ≈ 210 | 0 |
| `blackbox/cli/__snapshots__/init.preflight.acceptance.test.ts.snap` — [case1], [case2], [case5] | ≈ 62 | 0 |
| `blackbox/cli/upgrade.acceptance.test.ts` — imports + [case18] | ≈ 181 | 1 |
| `blackbox/cli/__snapshots__/upgrade.acceptance.test.ts.snap` — [case18] t0, t1 | ≈ 47 | 0 |
| `.agent/repo=.this/role=any/briefs/behavior/inventory.of=requirements.case=10.unwritable-brain-dir-fails-before-any-hook.md` | 33 | 0 |
| `.agent/repo=.this/role=any/briefs/behavior/inventory.of=requirements.case=13.claude-link-that-aims-elsewhere-refuses-first.md` | 28 | 0 |
| `.agent/repo=.this/role=any/briefs/behavior/inventory.of=requirements._.md` — rows 10, 13 | ≈ 2 | 0 |
| **total** | **≈ 1014** | **12** |

- fulcrums F6, F12 and F13 ride here
- the largest test share of any layer: ~14 of its ~21 min is tests and snapshots

### L4 — a part-way init leaves no unenrolled hooks (~23 min)

| file | + | − |
|---|---|---|
| `src/domain.operations/init/roles/link/RolesPartWayConstraintError.ts` | 7 | 0 |
| `src/domain.operations/init/roles/link/RolesPartWayMalfunctionError.ts` | 7 | 0 |
| `src/domain.operations/init/roles/link/asRolesPartWayFaultError.ts` | 38 | 0 |
| `src/domain.operations/init/roles/link/asRolesPartWayFaultError.test.ts` | 73 | 0 |
| `src/domain.operations/init/roles/link/isRolesPartWayFaultError.ts` | 13 | 0 |
| `src/domain.operations/init/roles/link/withRolesPartWayFault.ts` | 43 | 0 |
| `src/domain.operations/init/roles/link/withRolesPartWayFault.test.ts` | 70 | 0 |
| `src/domain.operations/init/roles/link/getRolesLinkedFromFound.ts` | 26 | 8 |
| `src/domain.operations/init/boots/syncBootsThenHooks.ts` | 54 | 0 |
| `src/domain.operations/init/boots/syncBootsThenHooksAfterPartWayFault.ts` | 30 | 0 |
| `src/domain.operations/init/boots/asResyncFaultNotice.ts` | 15 | 0 |
| `src/domain.operations/init/boots/asResyncFaultNotice.test.ts` | 34 | 0 |
| `src/contract/cli/invokeInit.ts` — imports, the part-way catch, the boots-then-hooks swap | ≈ 30 | 21 |
| `blackbox/cli/init.preflight.acceptance.test.ts` — [case3] | ≈ 116 | 0 |
| `blackbox/cli/__snapshots__/init.preflight.acceptance.test.ts.snap` — [case3] | ≈ 58 | 0 |
| `blackbox/cli/upgrade.acceptance.test.ts` — [case19] | ≈ 62 | 0 |
| `blackbox/cli/__snapshots__/upgrade.acceptance.test.ts.snap` — [case19] | ≈ 50 | 0 |
| `.agent/repo=.this/role=any/briefs/behavior/inventory.of=requirements.case=11.partial-init-leaves-no-unenrolled-hooks.md` | 37 | 0 |
| `.agent/repo=.this/role=any/briefs/behavior/inventory.of=requirements._.md` — row 11 | ≈ 1 | 0 |
| **total** | **≈ 764** | **29** |

- fulcrums F1, F2, F5, F8 and F9 ride here
- the largest prod share of any layer: ~15 of its ~23 min is prod code

### L5 — a global rhx skew is named (~4 min)

| file | + | − |
|---|---|---|
| `src/domain.operations/init/provenance/asRhxSkewNoticeOrNull.ts` | 18 | 0 |
| `src/domain.operations/init/provenance/asRhxSkewNoticeOrNull.test.ts` | 50 | 0 |
| `src/contract/cli/invokeInit.ts` — the notice import and row | ≈ 7 | 0 |
| `src/contract/cli/invokeInit.integration.test.ts` — the two skew `when` blocks | ≈ 43 | 0 |
| `blackbox/cli/init.preflight.acceptance.test.ts` — [case4] | ≈ 46 | 0 |
| `blackbox/cli/__snapshots__/init.preflight.acceptance.test.ts.snap` — [case4] | ≈ 2 | 0 |
| `.agent/repo=.this/role=any/briefs/behavior/inventory.of=requirements.case=15.global-rhx-skew-is-named.md` | 27 | 0 |
| `.agent/repo=.this/role=any/briefs/behavior/inventory.of=requirements._.md` — row 15, and the index head | ≈ 8 | 4 |
| **total** | **≈ 201** | **4** |

- fulcrum F3 rides here

### L6 — the route record (~19 min, a skim)

| file | + | − |
|---|---|---|
| `.behavior/v2026_10_21.fix-init-refuses-ambient-claude-link/` — 56 files | 3257 | 0 |
| `.dream/` — 4 files | 161 | 0 |
| `.agent/repo=.this/role=any/skills/absorb.peer.lane.sh` | 61 | 0 |
| **total** | **3479** | **0** |

- fulcrums F7, F10 and F11 ride here, since none of them names code in L0–L5
- this pr closes #657, as the last of the seven
- ~350 of its lines are `.route/passage.jsonl`, a machine log, read at a glance

## .what each tree owes before its pr opens

- cut the layer's files from `cde79138`, on a branch based on the layer below it
- types, lint and format pass
- the layer's own suites pass, scoped by path: its unit, integration and acceptance files
- every snapshot key the layer adds matches the one in #659, so a resnap is a defect, never a fix
- the pr body names its layer (`L<n> of 7`), the layer below it, and the fulcrums it carries

## .calls

- **#659's fate — ruled by the director, 2026-11-12.** it stays open as the index of the seven,
  and closes unmerged once L6 merges
- **B1–B4** wait on the commander's review where they land. B1–B4 are blueprint calls (thread
  ktlo-657-blueprint-b1-b4); each is reviewed in the layer whose code it shaped, and the
  blueprint itself sits in L6
