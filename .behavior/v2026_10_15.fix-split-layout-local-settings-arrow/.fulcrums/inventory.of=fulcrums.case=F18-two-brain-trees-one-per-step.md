# F18 — `rhx init --roles` and `rhx upgrade` print two `🧠 brain://repo=ambient` trees, one per step

## .the fork
- A: one tree per step, each under the same `🧠` head, as the snapshots hold
- B: label each tree with its step (a `step = layout` / `step = boot` subbranch, or a distinct glyph)
- C: merge both steps back into one tree at the end (the `asLayoutOfRun` shape this branch removed)

## .taken = A, and why
- C is what this branch undid on purpose: a merged report prints only after every role init, so an
  init that aborts hides the migration it followed. the layout step's own tree prints before any init
  (`setRepoActorBrainDirLayout.integration.test.ts` [case6], vision D7)
- each tree names only what its step did, under the dir it did it to. the `🧠` head names the brain dir,
  and both steps touch the same dir — the head is right twice. the rows tell the steps apart: the first
  holds `linked`, `replaced`, `unexcluded`; the second holds `boot.md`
- B adds a row to every tree for a distinction the rows already carry, and moves ~12 snapshot files

## .rework = clean
a subbranch in `asBrainDirLayoutReportLines` and `asBrainDirSyncReportLines`, then a resnap.

## .confidence = 75%, low because
peer r6 read two same-head trees as a puzzle; the wisher may want the label regardless.

## .where
`src/domain.operations/boot/asBrainDirLayoutReportLines.ts` · `asBrainDirSyncReportLines.ts` · the
`init*`, `upgrade*` and `brain-dir-boot.journey` snapshots

## .verdict
owed — for the wisher at the close.
