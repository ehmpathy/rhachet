# F20 — extant test intents flip; four follow a stated requirement, four are the driver's call

## .the fork
- A: rewrite each extant assertion to the new requirement, and cite the requirement beside it
- B: keep each old assertion and add the new one beside it
- C: hold the change until the wisher approves each flip again

## .taken = A, and why
each flip is a requirement the wisher stated and the inventory records, never a test bent to a defect:

| test | old intent | new intent | the requirement |
|---|---|---|---|
| `brain-dir-boot.journey` [t1.1] | the root `CLAUDE.local.md` loads | it stays out | `inventory.of=requirements.case=11`, the `CLAUDE.local.md` bullet (wisher, 2026-10-16, seed S5) |
| `brain-dir-boot.journey` [t8] | no `.local.json` is addable | exactly one is: the repo actor's local arrow, relative, to `settings.of.repo.json` | `case=10` (the arrow) + seed S2 (tracked settings name no machine path) |
| `invokeInit.integration` [t0] | a role init's permissions miss `settings.of.repo.json` | they land there by name | `case=8` (the layout lands before the role inits; mechanic writes the file by name, `#895`) |
| `setBrainDirSettingsLayout.integration` [case7] | a real `settings.local.json` stays | it is replaced by the arrow, and the replace is reported | `case=7` + `case=10` (one answer at every arrow name; seed S1) |

- B keeps an assertion of the old requirement, which now fails by design — a red test or a dead one
- C re-asks a call the wisher already made, by name and date, in the inventory
- `rule.forbid.dropped-behavioral-requirements`: only the wisher amends an entry. each row above is an
  amendment the wisher made; the proofs moved with it, and the case 7 proof row now names the change

### the flips the driver called — no wisher quote names them

these four rest on a requirement or a fulcrum, never on a verbatim wisher word. each is a call the
wisher may reverse at the close:

| test | old intent | new intent | the anchor | rework to revert |
|---|---|---|---|---|
| `asBrainDirSyncReportLines.test.ts` [case4b] [case5], journey [t1.2] | a re-render prints `boot.md … upgraded` | no row: a re-render alone is no news | fulcrum F16 (the playtest found the row printed on every `rhx init`) | clean: one gate, three snaps |
| `setBrainDirSettingsLayout.integration` [case6] | a grove-less drop of a real `settings.json` is silent | a `REMOVED` row names it | `case=7` (no loss is silent), criteria usecase.3, fulcrum F12 | clean: one row type |
| `invokeInit.integration` [t0], `upgrade.acceptance` [case12.1], ~7 snaps | a real `settings.json` is `moved` to the grove name | it is `replaced` by the grove arrow | `case=7` names `settings.json` as an arrow name; the define brief records the wisher's 2026-10-07 call for it. the two-tree order is F18 | dirty: the layout op's one answer |
| `asBrainDirBootFailureLines.test.ts` (4 asserts), journey + `invokeInit` (5 snaps) | the headline reads `boot.md not written` | it reads `not synced` | none in the wish: a sync fault can now come from the settings step, not only the boot.md write, so `not written` named the wrong step | clean: one string |

the old guard each flip retired still has a successor: [t8] still forbids every per-host file
(`/\.home\//`) and pins the one local name to its relative target; [case7] reports the replace so the
loss is never silent.

## .rework = clean
each is one `then` block.

## .confidence = 90% for the first four, 75% for the driver's four, low because
peer r8 and peer l3 r12 ask for explicit approval of each flip; the wisher may want it restated in
the pr. the driver's four carry no wisher quote at all, and the `not synced` headline is outside the
wish's scope (it could ride its own pr).

## .where
`blackbox/cli/brain-dir-boot.journey.acceptance.test.ts` [t1.1] [t8] ·
`src/contract/cli/invokeInit.integration.test.ts` [t0] ·
`src/domain.operations/actor/enrolled/setBrainDirSettingsLayout.integration.test.ts` [case7]

## .verdict
owed — for the wisher at the close.
