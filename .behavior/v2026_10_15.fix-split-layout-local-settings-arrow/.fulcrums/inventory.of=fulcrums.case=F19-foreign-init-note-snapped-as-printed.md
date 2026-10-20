# F19 — the mechanic init's false note is snapped as it prints, and fixed upstream

## .the fork
- A: snap the mechanic permissions init's stdout as `rhachet-roles-ehmpathy@1.39.5` prints it, and owe
  the reword to that repo
- B: mask or strip the note in this repo's snapshot until upstream rewords it
- C: patch the note here (a vendored init, or a `node_modules` edit)

## .taken = A, and why
- the text is a foreign package's stdout; rhachet only runs the init and passes its lines through. a
  snapshot that shows what a human sees is the honest lock, blemish and all
- B hides from the reviewer the exact line a human reads, so the blemish ships unseen — the opposite of
  what `rule.forbid.snapshot-visual-blemishes` asks a snapshot to do
- C forks a supplier's init from a consumer
- the reword is caught (`dreams/v2026_10_19.reseed.mechanic-permissions-note-misreads-the-split-layout.md`)
  and pushed upstream as the human; the radio holds it while `radio.uses` is blocked globally
  (`appendix/radio.task.mechanic-permissions-note.md`). rhachet resnaps when a release lands

## .rework = clean
one resnap of `init.incremental` once the upstream release lands.

## .confidence = 80%, low because
the wisher may hold the merge until upstream ships.

## .where
`blackbox/cli/__snapshots__/init.incremental.acceptance.test.ts.snap` [case1]

## .verdict
owed — for the wisher at the close.
