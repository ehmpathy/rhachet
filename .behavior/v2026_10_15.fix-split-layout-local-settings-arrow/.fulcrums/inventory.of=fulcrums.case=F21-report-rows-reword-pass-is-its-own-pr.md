# F21 — the brain-dir report rows get one reword pass, in its own pr

## .the fork
- A: reword the report rows now, in this diff
- B: ship the rows as they read, and do one reword pass over all of them in a pr of its own

## .taken = B, and why
four peer nitpicks ask for the same pass over the rows that `asBrainDirLayoutReportGroups` and
`asSettingsReplacedRow` emit:

| peer | the ask |
|---|---|
| 5.3 i003 r6 | `replaced` has three senses, and a `replaced` group hosts a row that says `removed` |
| 5.3 i004 r11 n1 | `unexcluded` reads as "kept"; its row says `dropped`, and a separate `dropped` group means another sense |
| 5.3 i004 r11 n2 | `its content is gone` is false for a committed file, which git still holds |
| 5.3 i004 r11 n3 | `🟡 the layout did not land` names no cause, where the peer failure rows do |

each is a fair point, and none ships a nameable harm: every row names the file and the fix. but each
reword moves the shared row source and every snapshot that renders it: enroll, init.full, init.hooks,
upgrade, the upgrade journey, role-inits, and the unit snaps. four rewords done one at a time would
move those snaps four times. one pass, with one vocabulary settled up front, moves them once.

n3 also needs the layout fault's cause carried out of `setRepoActorBrainDirLayout` to
`invokeRolesInit`, a contract change beyond this wish.

## .rework = dirty
the row text is a human contract snapped in ~8 files; a later reword is a resnap sweep plus a
vocabulary decision.

## .confidence = 80%, low because
n2 is the closest to a harm: a human with a committed `settings.local.json` is told its content is
gone, and may not think to `git checkout` it. the wisher may want n2 alone done now.

## .where
`src/domain.operations/boot/asBrainDirLayoutReportGroups.ts` · `asSettingsReplacedRow` ·
`src/contract/cli/invokeRolesInit.ts` (the layout-null warn) · the dream
`.dream/v2026_10_20.fix.brain-dir-report-rows-reword-pass.md`

## .verdict
owed — for the wisher at the close.
