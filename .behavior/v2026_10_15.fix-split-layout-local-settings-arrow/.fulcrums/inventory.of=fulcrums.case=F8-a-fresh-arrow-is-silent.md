# F8 — a fresh `settings.local.json` arrow is silent in stdout; only a lost file is reported

## .the fork
- A: report a LINKED row whenever the layout lays a fresh arrow (vision case=2 as first drawn)
- B: report only a loss — a REPLACED or REMOVED row; a fresh arrow, which lost no file, is silent

## .taken = B, and why
the brain dir report holds one law: success is not news (`asBrainDirSyncReportLines`). a row there
names what the human must learn — what moved, what was dropped, what file was replaced. a fresh arrow
over an absent name costs the human naught, so it reads as noise. and LINKED fires for every arrow on
every fresh box (the `.home` leaf is untracked, so each clone lays it anew), so A would add rows to
every first `rhx init` on every box, and to every acceptance snapshot that walks one.

vision case=2 is amended to the as-built behavior and points here.

## .rework = clean
the effect is already computed (`LINKED` in `setBrainDirSettingsLayout`); A is one more group in
`asBrainDirSyncReportLines` and a resnap of the journeys that render it.

## .confidence = 80%, low because
the wisher approved a vision that drew the LINKED row, and an upgrade that changes what a plain
`claude` loads may be news a human wants to see, loss or not.

## .where
`src/domain.operations/boot/asBrainDirSyncReportLines.ts` · `asSettingsReplacedOfRun.ts` ·
`1.vision.experience.case=2.fresh-link.md`

## .verdict
owed — for the wisher at the close.
