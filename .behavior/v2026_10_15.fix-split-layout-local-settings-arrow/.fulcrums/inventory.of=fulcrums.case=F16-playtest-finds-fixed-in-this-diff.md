# F16 — two defects the 5.3 playtest found are fixed in this diff, each with a clamp

## .the fork
- A: fix both here — a bare `rhx init` with no `package.json` crashes unclassified, and the `boot.md`
  row says `upgraded` on an unchanged render
- B: catch each as a dream with the shape of its fix, and leave this diff to the layout

## .taken = A, and why
- both are safe and small: the first is one `existsSync` guard in `discoverRolePackages`; the second is
  one write-time flag (`bootMdChanged`) the report reads
- the second is more visible after this branch — a `replaced` row now brings the boot row along — so the
  change that made it frequent is the change that owes the repair
- a deferral of a safe, small fix is the defect the deferral rule names (peer r1, blocker.2)

## .the clamps
- `discoverRolePackages.integration.test.ts` [case1] — no `package.json` discovers `[]`; red with the
  guard removed, green with it back
- `setBrainDirBoot.integration.test.ts` [case1][t2] — a second identical render reports
  `bootMdChanged: false`; a drifted boot.md reports `true`
- `asBrainDirSyncReportLines.test.ts` [case8] — an unchanged corpus prints no `boot.md` row; a changed
  one prints `upgraded`

## .rework = clean
each fix sits in the file the defect lived in; a revert is two small hunks.

## .confidence = 90%, low because
`bootMdChanged` adds a field to `BrainDirBootRender`, a type other renders share; every builder was
updated, and types pass, but the wisher may prefer the row read `unchanged` rather than vanish.

## .verdict
owed — for the wisher at the close.
